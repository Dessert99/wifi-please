// 연속된 퍼센트 인코딩 바이트를 찾는다.
const token = '%[a-f0-9]{2}';
const multiMatcher = new RegExp(`(${token})+`, 'gi');

const hexPair = /^[a-f\d]{2}$/i;

// 현재 위치의 퍼센트 인코딩 바이트와 다음 위치를 반환한다.
function parsePercentByte(input, position) {
	if (input.codePointAt(position) !== 37 || position + 3 > input.length) {
		return;
	}

	const digits = input.slice(position + 1, position + 3);

	if (!hexPair.test(digits)) {
		return;
	}

	return {byte: Number.parseInt(digits, 16), next: position + 3};
}

// UTF-8 선행 바이트에 필요한 길이를 반환한다.
function utf8SequenceLength(byte) {
	if (byte <= 0x7F) {
		return 1;
	}

	// 과도하게 긴 2바이트 인코딩을 제외한다.
	if (byte >= 0xC2 && byte <= 0xDF) {
		return 2;
	}

	if (byte >= 0xE0 && byte <= 0xEF) {
		return 3;
	}

	if (byte >= 0xF0 && byte <= 0xF4) {
		return 4;
	}

	return 0;
}

// UTF-8의 연속 바이트인지 검사한다.
function isContinuationByte(byte) {
	return byte >= 0x80 && byte <= 0xBF;
}

// 유효한 UTF-8 구간만 왼쪽부터 한 번씩 해석한다.
function decode(input) {
	try {
		return decodeURIComponent(input);
	} catch {
		let output = '';
		let position = 0;

		while (position < input.length) {
			if (input.codePointAt(position) !== 37) {
				output += input.charAt(position);
				position++;
				continue;
			}

			const firstByte = parsePercentByte(input, position);

			// 잘못된 퍼센트 표기는 원문으로 남긴다.
			if (!firstByte) {
				output += input.charAt(position);
				position++;
				continue;
			}

			const sequenceLength = utf8SequenceLength(firstByte.byte);

			// 잘못된 선행 바이트는 원문으로 남긴다.
			if (sequenceLength === 0) {
				output += input.slice(position, position + 3);
				position += 3;
				continue;
			}

			let end = firstByte.next;
			let validSequence = true;

			for (let index = 1; index < sequenceLength; index++) {
				const nextByte = parsePercentByte(input, end);

				if (!nextByte || !isContinuationByte(nextByte.byte)) {
					validSequence = false;
					break;
				}

				end = nextByte.next;
			}

			if (validSequence) {
				const encodedSequence = input.slice(position, end);

				try {
					output += decodeURIComponent(encodedSequence);
					position = end;
					continue;
				} catch {
					// 구조가 맞아도 유효하지 않은 UTF-8은 원문으로 남긴다.
				}
			}

			// 이어지는 바이트가 부족하면 첫 바이트를 원문으로 남긴다.
			output += input.slice(position, position + 3);
			position += 3;
		}

		return output;
	}
}

// 정상 구간과 잘못된 바이트를 섞은 입력을 부분 해석한다.
function customDecodeURIComponent(input) {
	// BOM 치환 결과를 미리 등록한다.
	const replaceMap = {
		'%FE%FF': '\uFFFD\uFFFD',
		'%FF%FE': '\uFFFD\uFFFD',
	};

	// 일반 문자와 분리된 인코딩 구간을 찾는다.
	let match = multiMatcher.exec(input);

	while (match) {
		try {
			// 가능한 긴 구간을 한 번에 해석한다.
			replaceMap[match[0]] = decodeURIComponent(match[0]);
		} catch {
			const result = decode(match[0]);

			if (result !== match[0]) {
				replaceMap[match[0]] = result;
			}
		}

		match = multiMatcher.exec(input);
	}

	// 결합 문자의 처리가 끝난 뒤 단독 C2를 치환한다.
	replaceMap['%C2'] = '\uFFFD';

	const entries = Object.keys(replaceMap);

	for (const key of entries) {
		// 긴 입력의 정규식 크기 제한과 달러 치환 해석을 피하고 원문 그대로 치환한다.
		input = input.split(key).join(replaceMap[key]);
	}

	return input;
}

// CommonJS 소비자에게 공식 수정 디코더를 함수로 제공한다.
module.exports = function decodeUriComponent(encodedURI) {
	if (typeof encodedURI !== 'string') {
		throw new TypeError(`Expected \`encodedURI\` to be of type \`string\`, got \`${typeof encodedURI}\``);
	}

	try {
		// 표준 디코더를 먼저 사용한다.
		return decodeURIComponent(encodedURI);
	} catch {
		// 잘못된 입력은 부분 디코더로 처리한다.
		return customDecodeURIComponent(encodedURI);
	}
};

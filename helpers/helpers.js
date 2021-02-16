'use strict'

/**
 * Converts given value to BN object if it is number or string. Otherwise defaultValue is
 * returned in case given value is not truthy.
 *
 * @param {number|string|BN|null} number
 * @param {number|string|BN|null} [defaultValue]
 * @returns {BN|null}
 */
function bn(number, defaultValue = null) {
	if (number == null) {
		if (defaultValue == null) {
			return null;
		}
		number = defaultValue;
	}

	return ethers.BigNumber.from(number);
}

module.exports.bn = bn;

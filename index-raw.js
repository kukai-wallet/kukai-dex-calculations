var dexterCalculations = (function (undefined) {
  "use strict";

  /**
   * Many functions use {(bigInt|number|string)} as parameter. These parameters 
   * are converted into bigInt from the big-integer package and are expected to
   * to be non-negative numbers. string should be a string encoded integer. If you
   * are interfacing this project from another programming language, you should
   * pass the value for the parameter in {(bigInt|number|string)} as a string to
   * avoid number size restrictions in JavaScript.
   */

  /**
   * =============================================================================
   * Internal utility functions
   * =============================================================================
   */

  /**
   * Test if a bigInt is greater than zero.
   * 
   * @param {bigInt} x
   * @returns {boolean} x > 0
   */
  function gtZero(x) {
    return x.compare(bigInt.zero) === 1;
  };

  /**
   * Test if a bigInt is greater than or equal to zero.
   *
   * @param {bigInt} x 
   * @returns {boolean} x >= 0
   */
  function geqZero(x) {
    return x.compare(bigInt.zero) >= 0;
  };

  /**
   * Test if a bigInt is equal to zero.
   *
   * @param {bigInt} x 
   * @returns {boolean} x == 0
   */
  function eqZero(x) {
    return x.compare(bigInt.zero) === 0;
  };

  /**
   * Test if a bigInt is less than or equal to zero.
   *
   * @param {bigInt} x 
   * @returns {boolean} x <= 0
   */
  function leqZero(x) {
    return x.compare(bigInt.zero) <= 0;
  };
  
  /**
   * Ceiling division. If the remainder is greater than zero, increment by one.
   *
   * @param {bigInt} x 
   * @param {bigInt} y
   * @returns {boolean} if rem(x,y) > 0 then (x/y+1) else (x/y)
   */
  function ceilingDiv(x,y) {
    var result = x.divmod(y);
    if (result.remainder.compare(bigInt.one) >= 0) {
      return x.divide(y).add(bigInt.one);
    };
    return x.divide(y);
  };

  /**
   * Updates xtzPool with the 2.5 tez subsidy. Since this is applied before all other operations it can be assumed to have been applied at least once for any call to the CPMM.
   *
   * @param {bigInt} xtzPool
   * @returns {bigInt} xtzPool + 2_500_000
   */
  function creditSubsidy(xtzPool) {
    return bigInt(xtzPool).add(bigInt(2500000));
  };

  /**
   * =============================================================================
   * xtzToToken entrypoint functions
   * =============================================================================
   */

  /**
   * Calculate the amount of token sold for a given XTZ input and Dexter's two pool 
   * values for the dexter xtzToToken entrypoint.
   * 
   * @param {(bigInt|number|string)} xtzIn - XTZ amount the sender sells to Dexter. Must be greater than zero.
   * @param {(bigInt|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {number} feePercent - A number between 0.0 and 100, denoting the percentage fee that the dex will deduct from the amount sent.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(bigInt|null)} The amount of token that Dexter will send to the :to address in the dexter xtzToToken entrypoint.
   */
  
  function xtzToTokenTokenOutput(xtzIn, xtzPool, tokenPool, feePercent, burnPercent, includeSubsidy) {
    var xtzPool = xtzPool;
    if (includeSubsidy) {
      xtzPool = creditSubsidy(xtzPool);
    }

    var xtzIn_ = bigInt.zero;
    var xtzPool_ = bigInt.zero;
    var tokenPool_ = bigInt.zero;
    var fee = (1000 - Math.floor(feePercent * 10))
    var burn = (1000 - Math.floor(burnPercent * 10))
    var feeMultiplier = fee * burn

    try {
      xtzIn_ = bigInt(xtzIn);
      xtzPool_ = bigInt(xtzPool);
      tokenPool_ = bigInt(tokenPool);  
    } catch(err) {
      return null;
    };
    if (gtZero(xtzIn_) && gtZero(xtzPool_) && gtZero(tokenPool_)) {
      // Includes variable fee (0.1% for LB, 0.3 for Quipu) and variable burn (0.1% for LB, 0% for Quipu) calculated separatedly: e.g. 0.1% for both:  999/1000 * 999/1000 = 998100/1000000
      // (xtzIn_ * tokenPool_ * 999 * 999) / (tokenPool * 1000 - tokenOut * 999 * 999)
      var numerator = xtzIn_.times(tokenPool_).times(bigInt(feeMultiplier));
      var denominator = xtzPool_.times(bigInt(1000000)).add(xtzIn_.times(bigInt(feeMultiplier)));
      return numerator.divide(denominator);
    } else {
      return null;
    };
  };

  /**
   * Calculate the amount of XTZ you must pay in in order to receive a target 
   * amount of token for a given in the two Dexter pools. tokenOut is considered the 
   * maximum amount a user may receive. The user may receive less because of slippage.
   * 
   * @param {(bigInt|number|string)} tokenOut - The amount of token that a user wants to receive. Must be greater than zero.
   * @param {(bigInt|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} decimals - The number of decimals a token has. Must be greater than or equal to zero.
   * @param {number} feePercent - A number between 0.0 and 100, denoting the percentage fee that the dex will deduct from the amount sent.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(bigInt|null)} The amount of XTZ the user must send to xtzToToken to get the tokenOut amount.
   */
  function xtzToTokenXtzInput(tokenOut, xtzPool, tokenPool, decimals, feePercent, burnPercent, includeSubsidy) {
    var xtzPool = xtzPool;
    if (includeSubsidy) {
      xtzPool = creditSubsidy(xtzPool);
    }

    var tokenOut_  = bigInt.zero;
    var xtzPool_   = bigInt.zero;
    var tokenPool_ = bigInt.zero;
    var decimals_  = bigInt.zero;
    var fee = (1000 - Math.floor(feePercent * 10))
    var burn = (1000 - Math.floor(burnPercent * 10))
    var feeMultiplier = fee * burn

    try {
      tokenOut_  = bigInt(tokenOut);
      xtzPool_   = bigInt(xtzPool);
      tokenPool_ = bigInt(tokenPool);
      decimals_  = bigInt(decimals);
    } catch(err) {
      return null;
    };

    if (gtZero(tokenOut_) && gtZero(xtzPool_) && gtZero(tokenPool_) && geqZero(decimals_)) {
      // Includes variable fee (0.1% for LB, 0.3 for Quipu) and variable burn (0.1% for LB, 0% for Quipu) calculated separatedly: e.g. 0.1% for both:  999/1000 * 999/1000 = 998100/1000000
      // (xtzPool_ * tokenOut_ * 1000 * 1000 * 10 ** decimals) / (tokenPool - tokenOut * 999 * 999 * 10 ** decimals))
      var result =
          xtzPool_.times(tokenOut_)
          .times(bigInt(1000000)).times(Math.pow(10, decimals_))
          .divide(tokenPool_.minus(tokenOut_).times(bigInt(feeMultiplier).times(Math.pow(10, decimals_))));

      if (gtZero(result)) {
        return result;
      };
      return null;
    } else {
      return null;
    };
  };

  /**
   * Calculate the exchange rate for an XTZ to Token trade including the supplied fee given
   * to the liquidity providers and the penalty for trade size.
   * 
   * @param {(bigInt|number|string)} xtzIn - XTZ amount the sender sells to Dexter. Must be greater than zero.
   * @param {(bigInt|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {number} feePercent - A number between 0.0 and 100, denoting the percentage fee that the dex will deduct from the amount sent.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(number|null)} The exchange rate as a float number.
   */
  function xtzToTokenExchangeRate(xtzIn, xtzPool, tokenPool, feePercent, burnPercent, includeSubsidy) {
    var xtzIn_ = bigInt.zero;
    var xtzPool_ = bigInt.zero;
    var tokenPool_ = bigInt.zero;
    try {
      xtzIn_ = bigInt(xtzIn);
      xtzPool_ = bigInt(xtzPool);
      tokenPool_ = bigInt(tokenPool);  
    } catch(err) {
      return null;
    };
    if (gtZero(xtzIn_) && gtZero(xtzPool_) && gtZero(tokenPool_)) {
      return xtzToTokenTokenOutput(xtzIn_, xtzPool_, tokenPool_, feePercent, burnPercent, includeSubsidy) / xtzIn_;
    } else {
      return null;
    }
  };

  /**
   * Same as xtzToTokenExchangeRate but adjusted for the decimal places.
   * 
   * @param {(bigInt|number|string)} xtzIn - XTZ amount the sender sells to Dexter. Must be greater than zero.
   * @param {(bigInt|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} decimals - The number of decimals a token has. Must be greater than or equal to zero.
   * @param {number} feePercent - A number between 0.0 and 100, denoting the percentage fee that the dex will deduct from the amount sent.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(number|null)} The exchange rate as a float number.
   */
  function xtzToTokenExchangeRateForDisplay(xtzIn, xtzPool, tokenPool, decimals, feePercent, burnPercent, includeSubsidy) {
    var xtzIn_ = bigInt.zero;
    var xtzPool_ = bigInt.zero;
    var tokenPool_ = bigInt.zero;
    try {
      xtzIn_ = bigInt(xtzIn);
      xtzPool_ = bigInt(xtzPool);
      tokenPool_ = bigInt(tokenPool);  
    } catch(err) {
      return null;
    };
    if (gtZero(xtzIn_) && gtZero(xtzPool_) && gtZero(tokenPool_)) {
      return (xtzToTokenTokenOutput(xtzIn_, xtzPool_, tokenPool_, feePercent, burnPercent, includeSubsidy) * Math.pow(10, -(decimals))) / (xtzIn_ * Math.pow(10, -6));
    } else {
      return null;
    }
  };

  /**
   * Calculate the xtzToToken market rate for a give Dexter contract. The market 
   * rate is an ideal number that doesn't include fees or penalties. In practice, 
   * this rate  cannot be executed. This is used for displaying an exchange rate
   * without the trade size penalty (before a user enters an amount for display).
   * 
   * @param {(bigInt|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} decimals - The number of decimals a token has. Must be greater than or equal to zero.
   * @returns {(number|null)} The market rate as a float value.
   */
  function xtzToTokenMarketRate(xtzPool, tokenPool, decimals) {
    var xtzPool_ = bigInt.zero;
    var tokenPool_ = bigInt.zero;
    var decimals_ = bigInt.zero;    
    try {
      xtzPool_ = bigInt(xtzPool);
      tokenPool_ = bigInt(tokenPool);
      decimals_ = bigInt(decimals);
    } catch(err) {
      return null;
    };
    if (gtZero(xtzPool_) && gtZero(tokenPool_) && geqZero(decimals_)) {
      var xtzPool__    = xtzPool_ * Math.pow(10, -6);
      var tokenPool__  = tokenPool_ * Math.pow(10, -(decimals_));
      return (tokenPool__ / xtzPool__);
    } else {
      return null;
    };
  };

  /**
   * Calculate the xtzToToken price impact for a given Dexter contract. Price
   * impact is a measure of how much a trade will alter the future price.
   * 
   * @param {(bigInt|number|string)} xtzIn - The amount of XTZ the sender will sell to Dexter in xtzToToken.
   * @param {(bigInt|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {number} feePercent - A number between 0.0 and 100, denoting the percentage fee that the dex will deduct from the amount sent.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(number|null)} - The price impact percentage as a float value.
   */
  function xtzToTokenPriceImpact(xtzIn, xtzPool, tokenPool, feePercent, burnPercent, includeSubsidy) {
    var expectedTokenPayout = xtzToTokenTokenOutput(xtzIn, xtzPool, tokenPool, feePercent, burnPercent, includeSubsidy)

    var xtzPool = xtzPool;
    if (includeSubsidy) {
      xtzPool = creditSubsidy(xtzPool);
    }
    var xtzIn_ = bigInt.zero;
    var xtzPool_ = bigInt.zero;
    var tokenPool_ = bigInt.zero;
    var burn = (1000 - Math.floor(burnPercent * 10))

    try {
      xtzIn_ = bigInt(xtzIn);
      xtzPool_ = bigInt(xtzPool);
      tokenPool_ = bigInt(tokenPool);  
    } catch(err) {
      return null;
    };

    if (gtZero(xtzIn_) && gtZero(xtzPool_) && gtZero(tokenPool_)) {
      var currentMidPrice = xtzPool_ / tokenPool_
      var xtzInNetBurn = xtzIn_.times(burn).divide(1000);
      var postTradeMidPrice =  (xtzPool_ + xtzInNetBurn) / (tokenPool_ - expectedTokenPayout)

      var result = Math.abs(1 - (postTradeMidPrice / currentMidPrice))

      if (result < 0.00001) {
        return 0 // avoid returning "6.71243e-17"
      } else {
        return result
      }

    } else {
      return null;
    };
  };  
  
  /**
   * Calculate the minimum token out to be sent to Dexter for a given max tokenOut
   * and the max allowed slippage rate the user accepts. If the exchange rate
   * has lowered less than the user's allowed slippage at the time of execution,
   * then the trade will fail.
   * 
   * @param {(bigInt|number|string)} tokenOut - Token out as calculated by xtzToTokenTokenOut. Must be greater than zero.
   * @param {number} allowedSlippage - Maximum slippage rate that a user will except for an exchange. Must be between 0.00 and 1.00.
   * @returns {(bigInt|null)} The minimum token amount to send to the xtzToToken entrypoint.
   */
  function xtzToTokenMinimumTokenOutput(tokenOut, allowedSlippage) {
    if (tokenOut > 0 && allowedSlippage >= 0.0 && allowedSlippage <= 1.0) {
      // ((tokenOut * 1000) - ((tokenOut * 1000) * (allowedSlippage * 100000) / 100000)) / 1000
      var tokenOut_ = bigInt(tokenOut).times(bigInt(1000));
      var allowedSlippage_ = bigInt(Math.floor(allowedSlippage * 1000 * 100));
      var result = tokenOut_.minus(tokenOut_.times(allowedSlippage_).divide(bigInt(100000))).divide(1000);
      return bigInt.max(result, bigInt.one);
    } else {
      return null;
    };
  };

  /**
   * Calculate the fee that liquidity providers, as a whole and not individually, 
   * will receive for a given amount of XTZ sold to a dexter contract.
   * 
   * @param {(bigInt|number|string)} xtzIn The amount of XTZ sold to dexter. Must be greater than zero.
   * @returns {(number|null)} The fee paid to the dexter liquidity providers.
   */
  function totalLiquidityProviderFee(xtzIn) {
    var xtzIn_ = bigInt.zero;
    try {
      xtzIn_ = bigInt(xtzIn);
    } catch(err) {
      return null;
    };
    if (gtZero(xtzIn_)) {  
      return bigInt(xtzIn_).times(bigInt(1)).divide(1000);
    } else {
      return null;
    }
  };

  /**
   * Calculate the fee that a single liquidity provider will receive for a given amount of 
   * XTZ sold to a dexter contract.
   * 
   * @param {(bigInt|number|string)} xtzIn - The amount of XTZ sold to dexter. Must be greater than zero.
   * @returns {(number|null)} The fee paid to an individual dexter liquidity provider.
   */
  function liquidityProviderFee(xtzIn, totalLiquidity, userLiquidity) {
    var xtzIn_ = bigInt.zero;
    var totalLiquidity_ = bigInt.zero;
    var userLiquidity_ = bigInt.zero;
    try {
      xtzIn_ = bigInt(xtzIn);
      totalLiquidity_ = bigInt(totalLiquidity);
      userLiquidity_ = bigInt(userLiquidity);
    } catch(err) {
      return null;
    };
    if (gtZero(xtzIn_) && gtZero(totalLiquidity_) && gtZero(userLiquidity_)) {
      return totalLiquidityProviderFee(xtzIn).divide(totalLiquidity_.divide(userLiquidity));
    } else {
      return null;
    }
  };
  
  /**
   * =============================================================================
   * tokenToXtz entrypoint functions
   * =============================================================================
   */

  /**
   * Get the amount of XTZ sold for a given token input and the pool state of Dexter
   * for the Dexter tokenToXtz entrypoint.
   *
   * @param {(bigInt|number|string)} tokenIn - Token amount the sender sells to Dexter. Must be greater than zero.
   * @param {(bigInt|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {number} feePercent - A number between 0.0 and 100, denoting the percentage fee that the dex will deduct from the amount sent.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(bigInt|null)} The amount of XTZ that Dexter will send to the :to 
   * address in the dexter tokenToXtz entrypoint.
   */
  function tokenToXtzXtzOutput(tokenIn, xtzPool, tokenPool, feePercent, burnPercent, includeSubsidy) {
    var xtzPool = xtzPool;
    if (includeSubsidy) {
      xtzPool = creditSubsidy(xtzPool);
    }
    var tokenIn_ = bigInt.zero;
    var xtzPool_ = bigInt.zero;
    var tokenPool_ = bigInt.zero;
    var fee = (1000 - Math.floor(feePercent * 10))
    var burn = (1000 - Math.floor(burnPercent * 10))
    var feeAndBurnMultiplier = fee * burn
    var feeMultiplier = fee * 1000

    try {
      tokenIn_ = bigInt(tokenIn);
      xtzPool_ = bigInt(xtzPool);
      tokenPool_ = bigInt(tokenPool);  
    } catch(err) {
      return null;
    };
    if (gtZero(tokenIn_) && gtZero(xtzPool_) && gtZero(tokenPool_)) {
      // Includes variable fee (0.1% for LB, 0.3 for Quipu) and variable burn (0.1% for LB, 0% for Quipu) calculated separatedly: e.g. 0.1% for both:  999/1000 * 999/1000 = 998100/1000000
      var numerator = bigInt(tokenIn).times(bigInt(xtzPool)).times(bigInt(feeAndBurnMultiplier));
      var denominator = bigInt(tokenPool).times(bigInt(1000000)).add(bigInt(tokenIn).times(bigInt(feeMultiplier)));
      return numerator.divide(denominator);
    } else {
      return null;
    };
  };

  /**
   * Calculate the amount of token you must pay in in order to receive a target 
   * amount of XTZ for a given Dexter pool state. xtzOut is considered the 
   * maximum amount a user may receive. The user may receive less because of slippage.
   * 
   * @param {(bigInt|number|string)} xtzOut - The amount of token that a user wants to receive. Must be greater than zero.
   * @param {(bigInt|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} decimals - The number of decimals a token has. Must be greater than or equal to zero.
   * @param {number} feePercent - A number between 0.0 and 100, denoting the percentage fee that the dex will deduct from the amount sent.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(bigInt|null)} The amount of token the user must send to tokenToXtz to get the xtzOut amount.
   */
  function tokenToXtzTokenInput(xtzOut, xtzPool, tokenPool, decimals, feePercent, burnPercent, includeSubsidy) {
    var xtzPool = xtzPool;
    if (includeSubsidy) {
      xtzPool = creditSubsidy(xtzPool);
    }

    var xtzOut_ = bigInt.zero;
    var xtzPool_ = bigInt.zero;
    var tokenPool_ = bigInt.zero;
    var decimals_ = bigInt.zero;  
    var fee = (1000 - Math.floor(feePercent * 10))
    var burn = (1000 - Math.floor(burnPercent * 10))
    var feeAndBurnMultiplier = fee * burn
    var feeMultiplier = fee * 1000

    try {
      xtzOut_ = bigInt(xtzOut);
      xtzPool_ = bigInt(xtzPool);
      tokenPool_ = bigInt(tokenPool);
      decimals_ = bigInt(decimals);    
    } catch(err) {
      return null;
    };
    if (gtZero(xtzOut_) && gtZero(xtzPool_) && gtZero(tokenPool_) && geqZero(decimals_)) {
      // Includes variable fee (0.1% for LB, 0.3 for Quipu) and variable burn (0.1% for LB, 0% for Quipu) calculated separatedly: e.g. 0.1% for both:  999/1000 * 999/1000 = 998100/1000000
      // (tokenPool_ * xtzOut_ * 1000 * 1000 * 10 ** decimals) / ((xtzPool * 999 * 1000 - xtzOut * 999 * 999) * 10 ** decimals))
      var result =
          tokenPool_.times(xtzOut_)
          .times(bigInt(1000000)).times(Math.pow(10, decimals_))
          .divide(xtzPool_.times(bigInt(feeMultiplier)).minus(xtzOut_.times(bigInt(feeAndBurnMultiplier))).times(Math.pow(10, decimals_)));

      if (gtZero(result)) {
        return result;
      };
      return null;

      
    } else {
      return null;
    };
    
  };

  /**
   * Calculate the exchange rate for a token to XTZ trade including the supplied fee given
   * to the liquidity providers and the penalty for large trades.
   * 
   * @param {(bigInt|number|string)} tokenIn - Token amount the sender sells to Dexter. Must be greater than zero.
   * @param {(bigInt|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {number} feePercent - A number between 0.0 and 100, denoting the percentage fee that the dex will deduct from the amount sent.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(number|null)} The exchange rate as a float number.
   */
  function tokenToXtzExchangeRate(tokenIn, xtzPool, tokenPool, feePercent, burnPercent, includeSubsidy) {
    var tokenIn_ = bigInt.zero;
    var xtzPool_ = bigInt.zero;
    var tokenPool_ = bigInt.zero;
    try {
      tokenIn_ = bigInt(tokenIn);
      xtzPool_ = bigInt(xtzPool);
      tokenPool_ = bigInt(tokenPool);  
    } catch(err) {
      return null;
    };
    if (gtZero(tokenIn_) && gtZero(xtzPool_) && gtZero(tokenPool_)) {
      return tokenToXtzXtzOutput(tokenIn_, xtzPool_, tokenPool_, feePercent, burnPercent, includeSubsidy) / tokenIn_;
    } else {
      return null;
    }  
  };

  /**
   * Same as tokenToXtzExchangeRate but adjusted for the decimal places.
   * 
   * @param {(bigInt|number|string)} tokenIn - Token amount the sender sells to Dexter. Must be greater than zero.
   * @param {(bigInt|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} decimals - The number of decimals a token has. Must be greater than or equal to zero.
   * @param {number} feePercent - A number between 0.0 and 100, denoting the percentage fee that the dex will deduct from the amount sent.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(number|null)} The exchange rate as a float number.
   */
  function tokenToXtzExchangeRateForDisplay(tokenIn, xtzPool, tokenPool, decimals, feePercent, burnPercent, includeSubsidy) {
    var tokenIn_ = bigInt.zero;
    var xtzPool_ = bigInt.zero;
    var tokenPool_ = bigInt.zero;
    try {
      tokenIn_ = bigInt(tokenIn);
      xtzPool_ = bigInt(xtzPool);
      tokenPool_ = bigInt(tokenPool);  
    } catch(err) {
      return null;
    };
    if (gtZero(tokenIn_) && gtZero(xtzPool_) && gtZero(tokenPool_)) {
      return (tokenToXtzXtzOutput(tokenIn_, xtzPool_, tokenPool_, feePercent, burnPercent, includeSubsidy) * Math.pow(10, -6)) / (tokenIn_ * Math.pow(10, -(decimals)));
    } else {
      return null;
    }  
  };

  /**
   * Calculate the tokenToXtz market rate for a given Dexter contract. The market 
   * rate is an ideal number that doesn't include fees or penalties. In practice, 
   * this rate cannot be executed. This is used for displaying an exchange rate
   * without the trade size penalty (before a user enters an amount for display).
   * 
   * @param {(bigInt|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} decimals - The number of decimals a token has. Must be greater than or equal to zero.
   * @returns {(number|null)} The market rate as a float value.
   */
  function tokenToXtzMarketRate(xtzPool, tokenPool, decimals) {
    var xtzPool_ = bigInt.zero;
    var tokenPool_ = bigInt.zero;
    var decimals_ = bigInt.zero;    
    try {
      xtzPool_ = bigInt(xtzPool);
      tokenPool_ = bigInt(tokenPool);
      decimals_ = bigInt(decimals);
    } catch(err) {
      return null;
    };
    if (gtZero(xtzPool_) && gtZero(tokenPool_) && geqZero(decimals_)) {
      var xtzPool__    = xtzPool_ * Math.pow(10, -6);
      var tokenPool__  = tokenPool_ * Math.pow(10, -(decimals_));
      return (xtzPool__ / tokenPool__);
    } else {
      return null;
    };
  };

  /**
   * Calculate the tokenToXtz price impact for a give Dexter contract. Price
   * impact is a measure of how much a trade will alter the future price.
   * 
   * @param {(bigInt|number|string)} tokenIn - The amount of Token the sender will sell to Dexter in tokenToXtz.
   * @param {(bigInt|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {number} feePercent - A number between 0.0 and 100, denoting the percentage fee that the dex will deduct from the amount sent.
   * @param {number} burnPercent - A number between 0.0 and 100, denoting the percentage of the tokens that will be burned by the dex during the trade.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(number|null)} - The price impact percentage as a float value.
   */
  function tokenToXtzPriceImpact(tokenIn, xtzPool, tokenPool, feePercent, burnPercent, includeSubsidy) {
    var expectedXTZPayout = tokenToXtzXtzOutput(tokenIn, xtzPool, tokenPool, feePercent, burnPercent, includeSubsidy)

    var xtzPool = xtzPool;
    if (includeSubsidy) {
      xtzPool = creditSubsidy(xtzPool);
    }
    var tokenIn_    = bigInt.zero;
    var xtzPool_    = bigInt.zero;
    var tokenPool_  = bigInt.zero;

    try {
      tokenIn_    = bigInt(tokenIn);
      xtzPool_    = bigInt(xtzPool);
      tokenPool_  = bigInt(tokenPool);
    } catch(err) {
      return null;
    };
    if (gtZero(tokenIn_) && gtZero(xtzPool_) && gtZero(tokenPool_)) {
      var currentMidPrice = xtzPool_ / tokenPool_
      var postTradeMidPrice =  (xtzPool_ - expectedXTZPayout) / (tokenPool_ + tokenIn_)
      var result = Math.abs(1 - (postTradeMidPrice / currentMidPrice))

      if (result < 0.00001) {
        return 0 // avoid returning "6.71243e-17"
      } else {
        return result
      }

    } else {
      return null;
    };
  };  
  

  /**
   * Calculate the minimum token out to be sent to dexter for a given max xtzOut
   * and the max allowed slippage rate the user accepts.  If the exchange rate
   * has lowered less than the user's allowed slippage at the time of execution,
   * then the trade will fail.
   * 
   * @param {(bigInt|number|string)} xtzOut - XTZ out as calculated by tokenToXtzTokenOut. Must be greater than zero.
   * @param {number} allowedSlippage - Maximum slippage rate that a user will except for an exchange. Must be between 0.00 and 1.00.
   * @returns {(bigInt|null)} The minimum token amount to send to the tokenToXtz entrypoint.
   */
  function tokenToXtzMinimumXtzOutput(xtzOut, allowedSlippage) {
    if (xtzOut > 0 && allowedSlippage >= 0.0 && allowedSlippage <= 1.0) {
      // ((xtzOut * 1000) - ((xtzOut * 1000) * (allowedSlippage * 100000) / 100000)) / 1000
      var xtzOut_ = bigInt(xtzOut).times(bigInt(1000));
      var allowedSlippage_ = bigInt(Math.floor(allowedSlippage * 1000 * 100));      
      var result = xtzOut_.minus(xtzOut_.times(allowedSlippage_).divide(bigInt(100000))).divide(1000);
      return bigInt.max(result, bigInt.one);
    } else {
      return null;
    };
  };  

  /**
   * =============================================================================
   * addLiquidity entrypoint functions
   * =============================================================================
   */

  /**
   * Get the amount of liquidity created and rewarded given an XTZ input, 
   * the current liquidity in Dexter and the amount of XTZ held by Dexter.
   * Note that the token amount does not affect the liquidity.
   *
   * @param {(bigInt|number|string)} xtzIn - XTZ amount the sender gives to Dexter for liquidity. Must be greater than zero.
   * @param {(bigInt|number|string)} xtzPool - XTZ amount that Dexter holds.  Must be greater than zero.
   * @param {(bigInt|number|string)} totalLiquidity - Total amount of liquidity in a Dexter pool. Must be greater than or equal to zero.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(bigInt|null)} The amount of liquidity that the sender gains.
   */
  function addLiquidityLiquidityCreated(xtzIn, xtzPool, totalLiquidity, includeSubsidy) {
    var xtzPool = xtzPool;
    if (includeSubsidy) {
      xtzPool = creditSubsidy(xtzPool);
    }
    var xtzIn_ = bigInt.zero;
    var xtzPool_ = bigInt.zero;
    var totalLiquidity_ = bigInt.zero;
    try {
      xtzIn_ = bigInt(xtzIn);
      xtzPool_ = bigInt(xtzPool);
      totalLiquidity_ = bigInt(totalLiquidity);  
    } catch(err) {
      return null;
    };  
    if (gtZero(xtzIn_) > 0 && gtZero(xtzPool_)) {
      if (eqZero(totalLiquidity_)) {
        return bigInt(xtzIn).times(bigInt(totalLiquidity)).divide(bigInt(xtzPool));

      } else if (gtZero(totalLiquidity_)) {
        return bigInt(xtzIn).times(bigInt(totalLiquidity)).divide(bigInt(xtzPool));

      };
      return null;
    } else {
      return null;
    };  
  };

  /**
   * For a given amount of xtzIn and the state of the Dexter xtz pool and token
   * pool. Calculate the minimum amount of tokens the user would be required
   * to deposit. If totalLiquidity is zero then sender must deposit at least one
   * XTZ (1,000,000 mutez) and one token. The exchange rate is not set.
   *
   * @param {(bigInt|number|string)} xtzIn - XTZ amount the sender gives to Dexter for liquidity. Must be greater than zero.
   * @param {(bigInt|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(bigInt|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(bigInt|null)} The amount of liquidity that the sender gains.
   */
  function addLiquidityTokenIn(xtzIn, xtzPool, tokenPool, includeSubsidy) {
    var xtzPool = xtzPool;
    if (includeSubsidy) {
      xtzPool = creditSubsidy(xtzPool);
    }
    var xtzIn_ = bigInt.zero;
    var xtzPool_ = bigInt.zero;
    var tokenPool_ = bigInt.zero;
    try {
      xtzIn_ = bigInt(xtzIn);
      xtzPool_ = bigInt(xtzPool);
      tokenPool_ = bigInt(tokenPool);  
    } catch(err) {
      return null;
    };  
    if (gtZero(xtzIn_) > 0 && gtZero(xtzPool_) && gtZero(tokenPool_)) {
      // cdiv(xtzIn_ * tokenPool_, xtzPool_)
      return ceilingDiv(xtzIn_.times(tokenPool_), xtzPool_);
    } else {
      return null;
    };  
  };

  /**
   * For a given amount of tokenIn and the state of the Dexter xtz pool and token
   * pool. Calculate the minimum amount of XTZ the user would be required
   * to deposit. If totalLiquidity is zero then sender must deposit at least one
   * XTZ (1,000,000 mutez) and one token. The exchange rate is not set.
   *
   * @param {(bigInt|number|string)} tokenIn - Token amount the sender gives to Dexter for liquidity.
   * @param {(bigInt|number|string)} xtzPool - XTZ amount that Dexter holds.
   * @param {(bigInt|number|string)} tokenPool Token amount that Dexter holds.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {{bigInt|null}} The amount of liquidity that the sender gains.
   */
  function addLiquidityXtzIn(tokenIn, xtzPool, tokenPool, includeSubsidy) {
    var xtzPool = xtzPool;
    if (includeSubsidy) {
      xtzPool = creditSubsidy(xtzPool);
    }
    var tokenIn_ = bigInt.zero;
    var xtzPool_ = bigInt.zero;
    var tokenPool_ = bigInt.zero;
    try {
      tokenIn_ = bigInt(tokenIn);
      xtzPool_ = bigInt(xtzPool);
      tokenPool_ = bigInt(tokenPool);  
    } catch(err) {
      return null;
    };
    if (gtZero(tokenIn_) > 0 && gtZero(xtzPool_) && gtZero(tokenPool_)) {
      // div(tokenIn_ * xtzPool_, tokenPool_)
      return tokenIn_.times(xtzPool_).divide(tokenPool_);
    } else {
      return null;
    };  
  };


  /**
   * =============================================================================
   * removeLiquidity entrypoint functions
   * =============================================================================
   */

  /**
   * Calculate the amount of token a sender would receive for burning a certain amount
   * of liquidity given a Dexter exchange that has a certain amount of 
   * total liquidity and holds an amount of token.
   *
   * @param {(bigInt|number|string)} liquidityBurned LQT that the sender burns.
   * @param {(bigInt|number|string)} totalLiquidity The total amount of liquidity in a Dexter exchange.
   * @param {(bigInt|number|string)} tokenPool amount of token that Dexter holds.
   * @returns {(bigInt|null)} The amount of token that the sender gains.
   */
  function removeLiquidityTokenOut(liquidityBurned, totalLiquidity, tokenPool) {
    var liquidityBurned_ = bigInt.zero;
    var totalLiquidity_ = bigInt.zero;
    var tokenPool_ = bigInt.zero;
    try {
      liquidityBurned_ = bigInt(liquidityBurned);
      totalLiquidity_ = bigInt(totalLiquidity);
      tokenPool_ = bigInt(tokenPool);  
    } catch(err) {
      return null;
    };
    if (gtZero(liquidityBurned_) && gtZero(totalLiquidity_) && gtZero(tokenPool_)) {
      // tokenPool_ * liquidityBurned_ / totalLiquidity_
      return tokenPool_.times(liquidityBurned_).divide(totalLiquidity_);
    } else {
      return null;
    };
  };

  /**
   * Calculate the amount of XTZ a sender would receive for burning a certain amount
   * of liquidity given a Dexter exchange that has a certain amount of 
   * total liquidity and holds an amount of XTZ.
   *
   * @param {(bigInt|number|string)} liquidityBurned LQT that the sender burns.
   * @param {(bigInt|number|string)} totalLiquidity The total amount of liquidity in a Dexter exchange.
   * @param {(bigInt|number|string)} xtzPool amount of token that Dexter holds.
   * @param {boolean} includeSubsidy - In the case of liquidity baking, a subsudy will be added per block, affecting the calcualtion. This boolean is used to control whether or not this is taken into account.
   * @returns {(bigInt|null)} The amount of XTZ that the sender gains.
   */
  function removeLiquidityXtzOut(liquidityBurned, totalLiquidity, xtzPool, includeSubsidy) {
    var xtzPool = xtzPool;
    if (includeSubsidy) {
      xtzPool = creditSubsidy(xtzPool);
    }
    var liquidityBurned_ = bigInt.zero;
    var totalLiquidity_ = bigInt.zero;
    var xtzPool_ = bigInt.zero;
    try {
      liquidityBurned_ = bigInt(liquidityBurned);
      totalLiquidity_ = bigInt(totalLiquidity);
      xtzPool_ = bigInt(xtzPool);
    } catch(err) {
      return null;
    };
    if (gtZero(liquidityBurned_) && gtZero(totalLiquidity_) && gtZero(xtzPool_)) {
      // xtzPool_ * liquidityBurned_ / totalLiquidity_
      return xtzPool_.times(liquidityBurned_).divide(totalLiquidity_);
    } else {
      return null;
    };
  };

  /**
   * Calculate the APY users can expect, based on the current XTZ anount in the contract
   *
   * @param {(bigInt|number|string)} xtzPool - XTZ amount in the contract.
   * @returns {(number|null)} The market rate as a float value.
   */
  function estimateLiquidityBakingAPY(xtzPool) {
    var xtzPool_ = bigInt.zero;
    try {
      xtzPool_ = bigInt(xtzPool);
    } catch(err) {
      return null;
    };

    var annualSubsidy = BigInt( (2.5 * 2 * 60 * 24 * 365) * 1000000 )
    return ((((xtzPool_.add(annualSubsidy) / xtzPool_) - 1) / 2) * 100)
  }
  
  return {
    // xtzToToken    
    xtzToTokenTokenOutput: xtzToTokenTokenOutput,
    xtzToTokenXtzInput: xtzToTokenXtzInput,
    xtzToTokenExchangeRate: xtzToTokenExchangeRate,
    xtzToTokenExchangeRateForDisplay: xtzToTokenExchangeRateForDisplay,
    xtzToTokenMarketRate: xtzToTokenMarketRate,
    xtzToTokenPriceImpact: xtzToTokenPriceImpact,
    xtzToTokenMinimumTokenOutput: xtzToTokenMinimumTokenOutput,
    totalLiquidityProviderFee: totalLiquidityProviderFee,
    liquidityProviderFee: liquidityProviderFee,

    // tokenToXtz
    tokenToXtzXtzOutput: tokenToXtzXtzOutput,
    tokenToXtzTokenInput: tokenToXtzTokenInput,
    tokenToXtzExchangeRate: tokenToXtzExchangeRate,
    tokenToXtzExchangeRateForDisplay: tokenToXtzExchangeRateForDisplay,
    tokenToXtzMarketRate: tokenToXtzMarketRate,
    tokenToXtzPriceImpact: tokenToXtzPriceImpact,
    tokenToXtzMinimumXtzOutput: tokenToXtzMinimumXtzOutput,
    
    // addLiquidity
    addLiquidityLiquidityCreated: addLiquidityLiquidityCreated,
    addLiquidityTokenIn: addLiquidityTokenIn,
    addLiquidityXtzIn: addLiquidityXtzIn,
    
    // removeLiquidity
    removeLiquidityTokenOut: removeLiquidityTokenOut,
    removeLiquidityXtzOut: removeLiquidityXtzOut,

    // Misc
    estimateLiquidityBakingAPY: estimateLiquidityBakingAPY
  };
})();

// Node.js check
if (typeof module !== "undefined" && module.hasOwnProperty("exports")) {
  module.exports = dexterCalculations;
}

// amd check
if (typeof define === "function" && define.amd) {
  define(function () {
    return dexterCalculations;
  });
};

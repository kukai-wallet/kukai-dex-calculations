# kukai-dex-calculations

This library is a fork of the nomdaic labs [library](https://gitlab.com/sophiagold/dexter-calculations/-/tree/liquidity_baking/) (which is itself a fork of the dexter calculations library made by camlCase) for performing the calculations necessary to complete swaps, add and remove liquidity against the Liquidity Baking contract. This copy has been slightly modified to be more generic. The fees, percentage of burn and whether or not to take into account the liquidity baking subsidy, have all been made parameters passed into functions rather than hardcoded. The number of decimals the destination / source token has, has also been added to the functions.

This only has one dependency: [big-integer](https://www.npmjs.com/package/big-integer). Most functions input types are `number` and most return the following types: `null`, `number` (float) or `big-integer`.

The `dist` folder contains 2 output js files. `index.js` can be used by web applications. `index-mobile.min.js` is a compact version with the dependencies merged into a single file, this allows this file to be imported into a native iOS or Android application to share the calculation code, without the need for cross-platform frameworks like React-Native or Flutter.



<br/>
<br/>
<br/>

## Fees

The functions in this library require the developer to pass in 3 additional variables

- `feePercent`
  This is a number between 0.0 and 100. It controls the percentage of the sent token that will be deducted as a fee from the swap.

- `burnPercent`
  This is a number between 0.0 and 100. It controls the percentage of the sent token sent as part of the sawp, that will be burned by the contract.

- `includeSubsidy`
  Liquidity baking includes a subsudy every block. This increase in XTZ will result in a change to the price, affecting the exchange rate. This boolean tells the library whether or not to take this into account during the calculations



<br/>
<br/>
<br/>

## Current Fee Settings

**Liquidity Baking:**

- feePercent: 0.1
- burnPercent: 0.1
- includeSubsidy: true

**Quipuswap:**

- feePercent: 0.3
- burnPercent: 0
- includeSubsidy: false



<br/>
<br/>
<br/>

## Examples

Look at [./index.test.js](./index.test.js).

## Loading in the browser

You should be able to load `dist/index-mobile.min.js` directly into an html file and it 
creates a global object `dexterCalculations`.

```js
const dexterCalculations = require('dexter-calculations');
dexterCalculations.xtzToTokenXtzInput(2000000, 38490742927, 44366268, 8);
```

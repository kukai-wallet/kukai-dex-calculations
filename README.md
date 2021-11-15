# dexter-calculations

This library performs a number of important calculations related to the Tezos 
[Dexter](https://gitlab.com/camlcase-dev/dexter/) contract's entrypoints. 
It is useful for any application wants to send operations to a Dexter contract 
like a dApp, wallet, arbitrage bot, etc.

This only has one dependency: [big-integer](https://www.npmjs.com/package/big-integer).
Most functions input types are `number` and most return the following types: 
`null`, `number` (float) or `big-integer`.

## Examples

Look at [./index.test.js](./index.test.js).

## Loading in the browser

You should be able to load `dist/index-mobile.min.js` directly into an html file and it 
creates a global object `dexterCalculations`.

```js
const dexterCalculations = require('dexter-calculations');
dexterCalculations.xtzToTokenXtzInput(2000000, 38490742927, 44366268, 8);
```

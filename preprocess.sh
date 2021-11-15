#!/bin/bash
# chmod u+x preprocess.sh

rm index.js
rm index-mobile.js

# preprocess index-raw.js
echo -e "var bigInt = require('big-integer');\n" > ./index.js
cat ./index-raw.js >> ./index.js

cat big-integer.min.js > index-mobile.js
cat ./index-raw.js >> ./index-mobile.js

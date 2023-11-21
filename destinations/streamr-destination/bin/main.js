#!/usr/bin/env node

const { mainCommand } = require('../lib/index.js');

mainCommand()
    .parseAsync(process.argv)
    .catch((err) => {
    console.error(err.message);
    process.exit(1);
});

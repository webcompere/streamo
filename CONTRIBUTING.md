## Build

Built with Node 18 and TypeScript

Built with `pnpm`

```bash
# install pnpm
npm i -g pnpm

# prepare for pnpm
pnpm i

# run the full build
pnpm run ci

# run the tests in watch mode
pnpm test:watch

# or just run the tests
pnpm test

# fix linting issues
pnpm lint:fix
```

## Contributing

This project is still incubating. Please feel free to raise issues, but we're not taking PRs at this time.

## TODO

- provide more examples and README
- publish to npm

- For async support, the entire library needs a second async implementation

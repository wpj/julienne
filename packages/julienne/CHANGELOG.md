# Change Log - julienne

## 0.4.3

### Patch Changes

- 8baf5c6: Sequence stylesheets so that overrides work correctly.
- b595e96: Deduplicate template resources.

## 0.4.2

### Patch Changes

- 213de1d: Include CSS and modulepreloads for dependent chunks.

## 0.4.1

### Patch Changes

- 8882e1b: Bare import `render` when no components are hydrated during partial
  hydration.

## 0.4.0

### Minor Changes

- 59d23cd: Add experimental support for partial hydration.
- e5ac409: Serialize page data to JavaScript.

## 0.3.0

### Minor Changes

- 84ee470: Switch to bundling with Vite, refactor core so that its only concern
  is rendering.

This log was last generated on Mon, 12 Oct 2020 21:29:05 GMT and should not be
manually modified.

## 0.2.0

Mon, 12 Oct 2020 21:29:05 GMT

### Minor changes

- Remove splitChunks config, implement a more flexible webpack asset handling
  method, throw AggregateError from Generator.build if page/file creation
  throws.

## 0.1.1

Sun, 04 Oct 2020 23:16:15 GMT

### Patches

- Add license to README

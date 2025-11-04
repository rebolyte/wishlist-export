## Communication

Be extremely concise in all responses. Sacrifice grammar for the sake of concision.

## Project overview

- Do not add emojis.
- Do not add comments in any code unless it is extremely complicated.
- Use minimal JSDoc annotations only when necessary.
- We are using Chrome extension Manifest V3.

## Alpine

By default, in order for Alpine to execute JavaScript expressions from HTML attributes like x-on:click="console.log()", it needs to use utilities that violate the "unsafe-eval" Content Security Policy that some applications enforce for security purposes. We use an alternate build that doesn't violate "unsafe-eval" and supports most of Alpine's inline expression syntax.

Most expressions work exactly like regular Alpine. Some advanced JavaScript features aren't supported:

```html
<!-- ❌ These don't work -->
<div x-data>
  <!-- Arrow functions -->
  <button x-on:click="() => console.log('hi')">Bad</button>

  <!-- Destructuring -->
  <div x-text="{ name } = user">Bad</div>

  <!-- Template literals -->
  <div x-text="`Hello ${name}`">Bad</div>

  <!-- Spread operator -->
  <div x-data="{ ...defaults }">Bad</div>
</div>
```

If you need any of these features, extract complex logic into dedicated functions or Alpine.data() components for better organization.

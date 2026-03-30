// Shared news data used by LatestNews (list) and NewsDetail (detail page)
export const newsData = [
  {
    id: 1,
    title: 'React 19: What\'s New',
    date: 'Dec 1, 2025',
    category: 'Framework',
    summary: 'React 19 introduces the new compiler, server components, and Actions API.',
    content:
      'React 19 is a major release that brings the long-awaited React Compiler, eliminating ' +
      'the need for manual useMemo and useCallback optimizations. Server Components are now ' +
      'stable, enabling seamless server-side rendering with client interactivity. The new ' +
      'Actions API simplifies form handling and async state updates. This release also ' +
      'improves hydration error messages, making debugging easier than ever.',
  },
  {
    id: 2,
    title: 'Custom Hooks: Best Practices',
    date: 'Nov 15, 2025',
    category: 'Hooks',
    summary: 'A deep dive into writing reusable, testable custom hooks in React.',
    content:
      'Custom hooks are one of React\'s most powerful features. By extracting stateful logic ' +
      'into a hook prefixed with "use", you can share it across components without modifying ' +
      'the component tree. Best practices include: keeping hooks focused on one concern, ' +
      'accepting configuration via parameters (like our useClickPosition logName), returning ' +
      'stable references with useCallback, and writing unit tests with React Testing Library.',
  },
  {
    id: 3,
    title: 'Context API vs. Redux in 2025',
    date: 'Oct 20, 2025',
    category: 'State Management',
    summary: 'When should you reach for Context, and when does Redux still make sense?',
    content:
      'The Context API shines for low-frequency global state like themes, user auth, and ' +
      'locale settings — exactly the use case in Lab 4\'s dark mode refactor. It avoids ' +
      'the boilerplate of Redux for simple cases. However, Redux Toolkit remains the better ' +
      'choice for complex, high-frequency state updates in large apps, thanks to its ' +
      'devtools, middleware ecosystem, and performance optimizations (selective re-renders).',
  },
];

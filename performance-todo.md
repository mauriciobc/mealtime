# Performance TODO: Reducing Redundant API Calls & Improving React Context Efficiency

This checklist will guide you through improving performance and reducing redundant API calls in our React app. Follow each step carefully, and ask for help if anything is unclear!

---

## 1. Audit and Refactor Provider Usage

**✅ Complete (2024-05-06):**
- Duplicate NotificationProvider removed from ClientLayout.
- NotificationProvider now only wraps the app at the top level (RootClientLayout).
- Metric: `[METRIC] NotificationProvider initialized` appears only once per render cycle (no duplicates).
- No context errors; notification features work as expected.
- No redundant notification API calls.

---

## 2. Optimize Effect Dependencies

**Goal:** Prevent `useEffect` hooks from running more often than necessary, which can cause duplicate API calls.

### Steps:
1. **Find useEffect Hooks:**
   - Search for all `useEffect` hooks in your providers and major components.
2. **Review Dependencies:**
   - Check the dependency array (the second argument to `useEffect`).
   - Only include variables that, when changed, should trigger the effect.
   - **Tip:** If you leave the array empty (`[]`), the effect runs only once on mount.
3. **Guard Against Redundant Fetches:**
   - Before making an API call inside `useEffect`, check if the data is already loaded.
   - Example:
     ```tsx
     useEffect(() => {
       if (!user && !isLoading) {
         fetchUser();
       }
     }, [user, isLoading]);
     ```
4. **Remove Unnecessary Dependencies:**
   - If a variable is not used inside the effect, remove it from the dependency array.
5. **Test:**
   - Reload the app and watch the logs/network tab. Each effect should only trigger as intended.

---

## 3. Memoize Context Values

**Goal:** Prevent unnecessary re-renders of context consumers by memoizing the value passed to the provider.

### Steps:
1. **Locate Context Providers:**
   - Open each provider file (e.g., `UserProvider.tsx`, `NotificationProvider.tsx`).
2. **Wrap Value in useMemo:**
   - Use `useMemo` to memoize the context value.
   - Example:
     ```tsx
     const value = useMemo(() => ({
       user,
       setUser,
       isLoading,
     }), [user, setUser, isLoading]);
     <UserContext.Provider value={value}>{children}</UserContext.Provider>
     ```
3. **Check for Functions in Value:**
   - If you pass functions in the context value, make sure they are stable (use `useCallback` if needed).
4. **Test:**
   - Use React DevTools to verify that consumers only re-render when the value actually changes.

---

## 4. Test in Both Development and Production Environments

**Goal:** Ensure your changes work as expected in both dev and production builds.

### Steps:
1. **Test in Development:**
   - Run the app with `npm run dev` or `yarn dev`.
   - Check the browser console and network tab for duplicate API calls or provider logs.
2. **Build for Production:**
   - Run `npm run build` and then `npm start` (or the equivalent for your project).
   - Repeat the checks above in the production build.
3. **Compare Behavior:**
   - Note that React Strict Mode in development may double-invoke some effects, but this should not happen in production.
   - Confirm that in production, each provider and effect only runs once as expected.
4. **Document Findings:**
   - If you find issues, document them and discuss with the team before making further changes.

---

**Remember:**
- Ask for help if you're unsure about any step.
- Keep your changes focused and commit often with clear messages.
- Update this checklist as you complete each section! 
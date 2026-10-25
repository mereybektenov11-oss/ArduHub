/** Games opt in only while displaying a result that contains mistakes. */
export function mentorRouteAllowed(path: string, gameResult: boolean) {
  return (
    /^\/app\/lesson\/[^/]+\/?$/.test(path) ||
    /^\/app\/projects\/[^/]+\/?$/.test(path) ||
    (gameResult && /^\/app\/practice\/[^/]+\/?$/.test(path))
  );
}

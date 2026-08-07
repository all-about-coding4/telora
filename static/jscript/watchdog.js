function runEverySecond(task, interval = 1000) {
  let timeoutId;
  
  const runner = () => {
    timeoutId = setTimeout(async () => {
      try {
        await task();
      } catch (err) {
        console.error('Task error:', err);
      }
      runner(); // schedule next
    }, interval);
  };
  
  runner(); // start immediately
  console.log(`watch dog is running... every ${interval}ms`);
  return () => clearTimeout(timeoutId);
}

export default{
  runEverySecond,
}
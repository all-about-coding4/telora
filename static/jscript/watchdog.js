function runEverySecond(task) {
  let timeoutId;
  
  const runner = () => {
    timeoutId = setTimeout(async () => {
      try {
        await task();
      } catch (err) {
        console.error('Task error:', err);
      }
      runner(); // schedule next
    }, 1000);
  };
  
  runner(); // start immediately
  console.log("watch dog is running...")
  return () => clearTimeout(timeoutId);
}

export default{
  runEverySecond,
}
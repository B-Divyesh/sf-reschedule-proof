# Move Confirmed demo

- Direct URL: `https://reschedule-proof.sociobot.in/demo` (`/?demo=1` redirects there too).
- One-click entry: **Try it with sample data** on the first screen.
- Sample data: three realistic changes for a piano lesson, bike-service pickup,
  and dog-grooming cancellation. They cover acknowledged, notified, and prepared
  states.
- Storage: demo records and defaults use the separate IndexedDB database
  `move-confirmed-demo`. The real `move-confirmed` database and the real license
  keys are not read or written in demo mode.
- Reset: **Reset demo** restores the three original changes.
- Exit: **Start for real** deletes the demo database and opens the empty real
  workspace. Demo card and receipt links retain `/demo`, so the whole round trip
  remains inside the sandbox.

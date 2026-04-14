***

# Quickdraw

Quickdraw is a browser-based reaction-time **game** where you “draw” by making a loud sound (like shouting or clapping) as soon as the screen turns green. [github](https://github.com/JDpiggy/quickdraw)

## How it works

- Click the “GO” button (or press Space) to start. [github](https://github.com/JDpiggy/quickdraw)
- The screen turns red, then shows a sequence of green “boop” dots in the center while you wait. [github](https://github.com/JDpiggy/quickdraw)
- After the dots, there is a random delay (3–6 seconds), then the whole screen turns green and plays a “GO” sound. [github](https://github.com/JDpiggy/quickdraw)
- As soon as it turns green, make a loud sound near your microphone (shout, clap, etc.). [github](https://github.com/JDpiggy/quickdraw)
- The game measures your reaction time in seconds with 4 decimal places and shows your result.  
- Your best (lowest) time is saved in `localStorage` and shown as your high score.

## Features

- Pure HTML, CSS, and JavaScript, no external libraries.  
- Microphone-based sound detection using the Web Audio API (`getUserMedia`, `AudioContext`, `AnalyserNode`).  
- Visual feedback of current input volume via a “Listening…” indicator.  
- Responsive layout and dot spacing for desktop and mobile screens.  
- Stored high score using `localStorage` so it persists across page reloads.

## Controls

- Click the **GO** button or press **Space** to start a round.  
- Make a loud sound when the screen turns green to “shoot”.  
- The game automatically resets a few seconds after each round.

## Requirements & Permissions

- A browser that supports `getUserMedia` and the Web Audio API (modern Chrome/Edge/Firefox/Opera, most mobile browsers).  
- You must allow microphone access when prompted, or sound detection will not work.  

If microphone access is denied, the game shows an alert asking you to enable it.

## Files

- `index.html` – Main page markup. [github](https://github.com/JDpiggy/quickdraw)
- `style.css` – Styling for screen colors, dots, timer, and overlays.  
- `script.js` – Game logic, audio setup, sound detection, high score handling.  
- `boop.mp3` – Sound played for each green dot. [github](https://github.com/JDpiggy/quickdraw)
- `go1.mp3` – Loud “GO” sound when the screen turns green. [github](https://github.com/JDpiggy/quickdraw)

## How to run

- Clone or download this repository. [github](https://github.com/JDpiggy/quickdraw)
- Open `index.html` in a supported browser.  
- Allow microphone access when prompted, then press **GO** and test your reaction speed!

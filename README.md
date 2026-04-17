# ASCII Chart

A small web tool that turns a list of numbers into an ASCII chart you can paste into a README, a commit message, a Slack post, or a terminal.

Try it: <https://horiastanxd.github.io/ascii-chart/>

## What it does

Paste data on the left, get a chart on the right. Four chart types:

- Horizontal bars
- Vertical bars
- Line
- Sparkline

Input formats that work:

```
42
15
31
```

```
Apple, 42
Banana, 15
Cherry, 31
```

```json
[42, 15, 31, 23, 38]
```

## Example output

Horizontal bars:

```
Apple  │ ████████████████████ 42
Banana │ ███████ 15
Cherry │ ██████████████ 31
Date   │ ███████████ 23
Elder  │ ██████████████████ 38
```

Sparkline:

```
▃▁▅▂▆▄█▇  (15 → 42)
```

Vertical bars:

```
180 ┤          █     █
    │          █  █  █
    │       █  █  █  █
    │    █  █  █  █  █
    │    █  █  █  █  █
 75 ┤ █  █  █  █  █  █
    └──────────────────
       Mon Tue Wed Thu Fri Sat Sun
```

## Running locally

It is three static files. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server
```

## License

MIT

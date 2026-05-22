const fs = require('fs');
const lines = fs.readFileSync('src/components/OwnerDashboard.tsx', 'utf8').split('\n');
const stack = [];
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  let idx = 0;
  while ((idx = line.indexOf('<div', idx)) !== -1) {
    stack.push({ line: i + 1, text: line.slice(idx) });
    idx += 4;
  }
  idx = 0;
  while ((idx = line.indexOf('</div>', idx)) !== -1) {
    if (stack.length === 0) {
      console.log('unmatched close at', i + 1);
    } else {
      stack.pop();
    }
    idx += 6;
  }
}
console.log('stack len', stack.length);
if (stack.length) console.log(stack.slice(-20));

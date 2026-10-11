// cmd.js

class CMDRegistry {
  #registry = new Map;

  add (key, obj) { this.registry.set(key, obj); }
  exec (key)     { this.get(key).exec(); }
}

const cmd = new CMDRegistry;

export { cmd, CMDRegistry }
export default cmd;



import commands from '@aufbau/commands';

app.commands = commands;

app.commands.exec('openNextTab');
app.commands.exec('openHistory');


<btn-push cmd:onclick='open-next-tab' />
  
<div
  cmd:onSwipeLeft='open-prev-tab'
  cmd:onSwipeRight='open-next-tab'
/>

<div
  on:swipe-left=${app.commands.exec('open-prev-tab')}
  on:swipe-right=${app.commands.exec('open-next-tab')}
/>

let device: BluetoothDevice | null = null;

function updateButtons() {
  const btnConnect = document.getElementById('btnconnect')!;
  const btnDisconnect = document.getElementById('btndisconnect')!;
  if (device) {
    btnConnect.classList.add('hidden');
    btnDisconnect.classList.remove('hidden');
  } else {
    btnConnect.classList.remove('hidden');
    btnDisconnect.classList.add('hidden');
  }
}

function get8bits(val: number) {
  return (val | 0x100)
    .toString(2)
    .substr(1)
    .split('')
    .map((x) => +x);
}

async function connect() {
  device = await navigator.bluetooth.requestDevice({
    filters: [
      {
        services: [0xfeed],
      },
    ],
  });
  device.addEventListener('gattserverdisconnected', () => {
    device = null;
    updateButtons();
  });
  updateButtons();
  await device.gatt!.connect();
  const svc = await device.gatt!.getPrimaryService(0xfeed);
  const width = (await (await svc.getCharacteristic(0xfe01)).readValue()).getUint16(0, true);
  const height = (await (await svc.getCharacteristic(0xfe02)).readValue()).getUint16(0, true);
  const canvas = document.querySelector('#main') as HTMLCanvasElement;
  canvas.setAttribute('width', width.toString());
  canvas.setAttribute('height', height.toString());
  const ctx = canvas.getContext('2d')!;
  const char = await svc.getCharacteristic(0xfeed);

  let pointer = -1;

  char.addEventListener('characteristicvaluechanged', (e) => {
    if (!char.value) {
      return;
    }

    if (char.value.byteLength === 19) {
      pointer = 0;
    }
    if (pointer < 0) {
      return;
    }
    for (let i = 0; i < char.value.byteLength; i++) {
      const val = char.value.getUint8(i);
      for (const bit of get8bits(val)) {
        const x = pointer % width;
        const y = Math.floor(pointer / width);
        ctx.fillStyle = bit ? 'black' : 'green';
        ctx.fillRect(x, y, 1, 1);
        pointer++;
      }
    }
  });
  await char.startNotifications();
}

function disconnect() {
  if (device) {
    device.gatt!.disconnect();
    device = null;
    updateButtons();
  }
}

(window as any).connect = connect;
(window as any).disconnect = disconnect;

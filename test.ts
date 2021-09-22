import { readFileSync, writeFileSync } from "fs";

function chunkBufferInGroups(buffer: Buffer, size: number): Buffer[] {
  const buffers: Buffer[] = [];

  for (let i = 0; i < buffer.length; i += size) {
    buffers.push(buffer.slice(i, i + size));
  }

  return buffers;
}

// Create temp files
const file = readFileSync("./tsconfig.json");

const chunks = chunkBufferInGroups(file, 50);

chunks.forEach((chunk, i) => {
  writeFileSync(`./temp/${i}.tmp`, chunk);
});

// // Convert temp files into buffer and write it
// const dir = readdirSync("./temp");

// const buffers: Buffer[] = [];

// const sortedDir = dir.sort((a, b) => {
//   const [ aNum ] = a.split(".");
//   const [ bNum ] = b.split(".");

//   return parseInt(aNum, 10) - parseInt(bNum, 10);
// });

// sortedDir.forEach((chunkName) => {
//   const chunk = readFileSync(`./temp/${chunkName}`);

//   buffers.push(chunk);
// });

// const final = Buffer.concat(buffers);

// const writeStream = createWriteStream("./temp/complete.json");

// writeFileSync.write("./temp/complete.json", final);

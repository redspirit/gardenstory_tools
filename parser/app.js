
const PEParser = require('./PEParser');


const parser = new PEParser();

const start = async () => {


	// const exeFile = `${__dirname}/../exe/CrackMe.exe`;
	// const exeFile = `${__dirname}/../exe/ub.exe`;
	const exeFile = `${__dirname}/../exe/original.exe`;
	// const exeFile = `${__dirname}/../exe/hello.exe`;

    await parser.loadFile(exeFile);

    // console.log('findStrings', parser.findStrings('options'));

    parser.createPatchedFile(`${__dirname}/../exe/game_patch.exe`);


}
start();


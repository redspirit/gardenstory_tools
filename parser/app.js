
const PEParser = require('./PEParser');


const parser = new PEParser();

const start = async () => {


	// const exeFile = `${__dirname}/../exe/CrackMe.exe`;
	// const exeFile = `${__dirname}/../exe/ub.exe`;
	// const exeFile = `${__dirname}/../exe/original.exe`;
	const exeFile = `${__dirname}/../exe/hello.exe`;

    await parser.loadFile(exeFile);

    // let result = parser.findStrings('code');
    // console.log(result);
    //
    // let addressForChange = parser.findXref(result[0].offset);
    // console.log('addressForChange', parser.intToHex(addressForChange));

    parser.createPatchedFile(`${__dirname}/../exe/patched.exe`);

    // todo
    // 3. добавление новой секции .strings со своими данными
    // 4. сохранение новой версии файла


}
start();


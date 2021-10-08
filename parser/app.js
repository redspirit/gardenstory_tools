
const PEParser = require('./PEParser');


const parser = new PEParser();

const start = async () => {


	// const exeFile = `${__dirname}/../exe/CrackMe.exe`;
	// const exeFile = `${__dirname}/../exe/ub.exe`;
	const exeFile = `${__dirname}/../exe/original.exe`;

    await parser.loadFile(exeFile);

    let result = parser.findStrings('a game');
    console.log(result);

    // todo
    // 2. поиск мест, где этот адрес используется
    // 3. добавление новой секции .strings со своими данными


}
start();


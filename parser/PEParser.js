const fs = require('fs');
const lang = require('./lang.json');

class PEParser {
    constructor() {
        this.buffer = null;
        this.strings = [];
    }

    intToHex (int) {
        return int.toString(16).toUpperCase();
    }

    hexToInt(hex) {
        return parseInt(hex, 16);
    }

    loadFile (filename) {
        return new Promise((resolve, reject) => {
            fs.readFile(filename, (err, buf) => {
                if(err) return reject(err);
                this.buffer = buf;

                this.headers = this.getHeaders();
                this.sections = this.getSections();
                this.strings = this.extractStrings();

                // console.log(this.headers);
                // console.log(this.sections);
                // console.log(this.strings);

                resolve(buf);
            });

        })
    }

    // взять строку из буфера
    getString(address, length, subBuffer = null) {
        let sbuf = subBuffer
            ? subBuffer.slice(address, address + length)
            : this.buffer.slice(address, address + length);
        let str = '';
        for (const char of sbuf) {
            if(char >= 32 && char <= 126) str += String.fromCharCode(char)
        }
        return str;
    }

    // отфильтровать все найденные строки среди уже найденных при загрузке файла
    findStrings(name) {

        return this.strings.filter(item => {
            return new RegExp(name, "i").test(item.data);
        }).map(item => {
            // item.section = this.getSectionByOffset(item.offset);
            // item.address = this.convertOffsetToVirtual(item.offset);
            // item.addressHex = this.intToHex(item.address);
            return item;
        });

    }

    findXref (offset) {
        let startOfSections = this.sections[0].pointerToRawData;
        let address = this.convertOffsetToVirtual(offset);
        let matches = [];
        for (let i = startOfSections; i < this.buffer.length - 4; i++) {
            if(this.buffer.readUInt32LE(i) === address) {
                matches.push(i);
            }
        }
        return matches;
    }

    getSectionByOffset(offset) {

        return this.sections.filter(section => {
            let start = section.pointerToRawData;
            let end = start + section.sizeOfRawData;
            return offset >= start && offset < end;
        })[0];

    }

    convertOffsetToVirtual (offset) {
        let section = this.getSectionByOffset(offset);
        if(!section) return null;
        return offset - section.pointerToRawData + section.virtualAddress + this.headers.imageBase;
    }

    // извлечь все строки из исполняемом файле (перед этим все секции должны быть найдены)
    extractStrings () {

        let startOfSections = this.sections[0].pointerToRawData;
        let buf = this.buffer.slice(startOfSections);
        let groups = [];
        let string = '';
        let addr = startOfSections;

        for (const char of buf) {
            if(char >= 32 && char <= 126) {
                string += String.fromCharCode(char)
            } else if(string.length > 0) {
                if(string.length > 2) groups.push({
                    offset: addr - string.length,
                    data: string,
                });
                string = '';
            }
            addr++;
        }

        return groups;

    }

    getHeaders () {

        let buf = this.buffer;

        let peHeaderAddress = buf.readUInt32LE(60);

        return {
            e_magic: buf.toString('utf8', 0, 2),
            e_lfanew: this.intToHex(peHeaderAddress),
            signature: this.getString(peHeaderAddress, 4),
            machine: this.intToHex(buf.readUInt16LE(peHeaderAddress + 4)),
            numberOfSections: buf.readUInt16LE(peHeaderAddress + 6),
            sizeOfOptionalHeader: buf.readUInt16LE(peHeaderAddress + 20),
            characteristics: this.intToHex(buf.readUInt16LE(peHeaderAddress + 22)),
            magic: this.intToHex(buf.readUInt16LE(peHeaderAddress + 24)),
            addressOfEntryPoint: this.intToHex(buf.readUInt32LE(peHeaderAddress + 40)),
            imageBase: buf.readUInt32LE(peHeaderAddress + 52),
            // imageBase: this.intToHex(buf.readBigUInt64LE(peHeaderAddress + 48)), // for 64
            sectionAlignment: buf.readUInt32LE(peHeaderAddress + 56),
            fileAlignment: this.intToHex(buf.readUInt32LE(peHeaderAddress + 60)),
            sizeOfImage: buf.readUInt32LE(peHeaderAddress + 80),
            sizeOfHeaders: this.intToHex(buf.readUInt32LE(peHeaderAddress + 84)),
            subsystem: this.intToHex(buf.readUInt16LE(peHeaderAddress + 92)),
            numberOfRvaAndSizes: buf.readUInt32LE(peHeaderAddress + 132),
            importsVA: this.intToHex(buf.readUInt32LE(peHeaderAddress + 132 + 12)),
        }

    }

    getSections () {
        let sectionsCount = this.getHeaders()['numberOfSections'];
        let headersSize = this.getHeaders()['sizeOfOptionalHeader'];
        let startAddress = this.buffer.readUInt32LE(60) + headersSize + 24;
        let sections = [];
        for(let i = 0; i < sectionsCount; i++) {
            let addr = startAddress + i * 40;
            let sect = this.buffer.slice(addr, addr + 40);
            sections.push({
                name: this.getString(0, 8, sect),
                virtualSize: sect.readUInt32LE(8),
                virtualAddress: sect.readUInt32LE(12),
                sizeOfRawData: sect.readUInt32LE(16),
                pointerToRawData: sect.readUInt32LE(20),
                characteristics: sect.readUInt32LE(36),
                headerPointer: addr,
            });
        }
        return sections;
    }

    createPatchedFile (path) {

        let textsLen = 0;
        lang.strings.forEach(item => {
            item.buffer = Buffer.from(item.text, 'utf8');
            item.localAddr = textsLen;
            textsLen += (item.buffer.length + 1);
        });

        let secAligment = this.headers.sectionAlignment;
        let contentVirtLen = Math.ceil(textsLen / 64) * 64;
        let contentLen = Math.ceil(textsLen / 512) * 512;
        let content = Buffer.alloc(contentLen);

        lang.strings.forEach(item => {
            item.buffer.copy(content, item.localAddr);
        });

        let buf = Buffer.alloc(this.buffer.length + content.length);
        this.buffer.copy(buf);

        let peHeaderAddress = buf.readUInt32LE(60);
        let lastSection = this.sections[this.sections.length - 1];
        let headerAddr = lastSection.headerPointer + 40;

        let sectionsAddr = this.buffer.length;

        buf.writeUInt16LE(this.headers.numberOfSections + 1, peHeaderAddress + 6)
        buf.writeUInt32LE(this.headers.sizeOfImage + content.length, peHeaderAddress + 80); //todo ???

        let secVirtAddr = Math.ceil((lastSection.virtualSize + lastSection.virtualAddress) / secAligment) * secAligment;

        buf.write('.strings', headerAddr, 8, 'utf8'); // name
        buf.writeUInt32LE(contentVirtLen, headerAddr + 8); // virtualSize возможно надо округлить до 64
        buf.writeUInt32LE(secVirtAddr, headerAddr + 12); // virtualAddress
        buf.writeUInt32LE(content.length, headerAddr + 16); // sizeOfRawData
        buf.writeUInt32LE(sectionsAddr, headerAddr + 20); // pointerToRawData
        buf.writeUInt32LE(this.hexToInt('C0000000'), headerAddr + 36); // characteristics

        content.copy(buf, sectionsAddr);

        lang.strings.forEach(item => {
            let va = item.localAddr + secVirtAddr + this.headers.imageBase;
            this.findXref(item.offset).forEach(xref => {
                buf.writeUInt32LE(va, xref);
            });
            console.log(item.text, this.intToHex(va));
        });

        // return console.log(va);
        fs.createWriteStream(path).write(buf);

    }

}

module.exports = PEParser;

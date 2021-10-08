const fs = require('fs');

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
        let match = null;
        for (let i = startOfSections; i < this.buffer.length - 4; i++) {
            if(this.buffer.readUInt32LE(i) === address) {
                match = i;
                break;
            }
        }
        return match;
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
            sectionAlignment: this.intToHex(buf.readUInt32LE(peHeaderAddress + 56)),
            fileAlignment: this.intToHex(buf.readUInt32LE(peHeaderAddress + 60)),
            sizeOfImage: this.intToHex(buf.readUInt32LE(peHeaderAddress + 80)),
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
            });
        }
        return sections;
    }

}

module.exports = PEParser;

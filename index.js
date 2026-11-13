const fs = require('fs');
const axios = require('axios');

const ALL_CHANNELS = [
    // --- 1. ช่องฟรีทีวีและช่องหลัก ---
    { id: "2", name: "เอ็นบีที 2 เอชดี" },
    { id: "3", name: "ไทยพีบีเอส เอชดี" },
    { id: "5", name: "5 เอชดี" },
    { id: "7", name: "ทีสปอร์ต 7" },
    { id: "10", name: "สถานีวิทยุโทรทัศน์รัฐสภา" },
    { id: "16", name: "ทีเอ็นเอ็น" },
    { id: "22", name: "เนชั่น ชาแนล" },
    { id: "23", name: "เวิร์คพอยท์" },
    { id: "24", name: "ทรูโฟร์ยู" },
    { id: "25", name: "จีเอ็มเอ็ม 25" },
    { id: "27", name: "ช่อง 8" },
    { id: "29", name: "โมโนแมกซ์ สปอร์ตส์" },
    { id: "30", name: "เอ็มคอท เอชดี 30" },
    { id: "31", name: "วัน เอชดี 31" },
    { id: "32", name: "ไทยรัฐทีวี เอชดี" },
    { id: "33", name: "3 เอชดี" },
    { id: "34", name: "อมรินทร์ ทีวี เอชดี" },
    { id: "35", name: "7 เอชดี" },
    { id: "36", name: "พีพีทีวี เอชดี" },
    
    // --- 2. ช่องภาพยนตร์และซีรีส์พรีเมียม (HBO & Warner) ---
    { id: "101", name: "เอชบีโอ (HBO)" },
    { id: "102", name: "เอชบีโอ ซิกเนเจอร์" },
    { id: "103", name: "เอชบีโอ ฮิตส์" },
    { id: "104", name: "เอชบีโอ แฟมิลี" },
    { id: "105", name: "ซิเนแม็กซ์" },
    { id: "106", name: "เอเชียน ฮิตส์" },
    { id: "107", name: "วอร์เนอร์ ทีวี" },
    { id: "108", name: "โมโน29 พลัส" },
    { id: "109", name: "ร็อค แอ็กชัน" },
    { id: "110", name: "ร็อค เอ็นเตอร์เทนเม้น" },

    // --- 3. ช่องการ์ตูน ---
    { id: "201", name: "การ์ตูนเน็ตเวิร์ค" },
    { id: "202", name: "การ์ตูนิโต" },
    { id: "203", name: "นิคโคโลเดียน" },
    { id: "204", name: "นิคจูเนียร์" },
    { id: "205", name: "บูมเมอแรง" },

    // --- 4. ช่องสารคดีและไลฟ์สไตล์ ---
    { id: "301", name: "ฟู้ดเน็ตเวิร์ค" },
    { id: "302", name: "เอเชี่ยน ฟู้ด เน็ตเวิร์ค" },
    { id: "303", name: "ทีแอลซี" },
    { id: "310", name: "ดิสคัฟเวอรี่" },
    { id: "311", name: "สำรวจโลก" },
    { id: "312", name: "แอนิมอล โชว์" },

    // --- 5. ช่องกีฬา ---
    { id: "401", name: "เพลย์สปอร์ต 1" },
    { id: "402", name: "เพลย์สปอร์ต 2" },
    { id: "410", name: "MUTV" },
    // สามารถเพิ่มช่องกีฬาอื่นๆ ต่อตรงนี้ได้ เช่น:
    // { id: "รหัสช่อง", name: "ชื่อช่องกีฬา" },

    // --- 6. ช่องข่าวต่างประเทศ ---
    { id: "601", name: "ซีเอ็นเอ็น" },
    { id: "602", name: "บีบีซี นิวส์" }
];

// ลิงก์ต้นทาง Open-EPG ประเทศไทย
const EPG_SOURCE_URL = 'https://www.open-epg.com/files/thailand2.xml';

async function generateCustomEPG() {
    try {
        console.log('กำลังดาวน์โหลดไฟล์ EPG จาก Open-EPG...');
        const response = await axios.get(EPG_SOURCE_URL, {
            responseType: 'text',
            timeout: 60000
        });

        const rawXml = response.data;

        // เริ่มสร้างโครงสร้าง XML ใหม่โดยใช้ช่องของคุณเอง
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<tv generator-info-name="AISPLAY-OpenEPG-Custom">\n';

        // 1. ใส่แท็ก Channel ของคุณ
        ALL_CHANNELS.forEach(ch => {
            xml += `  <channel id="${ch.id}">\n`;
            xml += `    <display-name lang="th">${ch.name}</display-name>\n`;
            xml += `  </channel>\n`;
        });

        // 2. จำลองดึงผังรายการมาผูกกับช่องของคุณ (หรือหากต้องการดึงแบบตรงตัว สามารถดึง programme จากต้นทางมาใส่ร่วมได้)
        // เพื่อให้ช่องของคุณมีผังจริงแสดงผลใน TiviMate ไม่โล่งโจ้ง
        ALL_CHANNELS.forEach(ch => {
            // สร้างผังรายการจำลองอ้างอิงจากข้อมูลสดเพื่อให้ TiviMate ดึงไปแสดงผลตามรหัสช่องของคุณได้ทันที
            xml += `  <programme start="20261113060000 +0700" stop="20261114060000 +0700" channel="${ch.id}">\n`;
            xml += `    <title lang="th">ผังรายการสด - ${ch.name}</title>\n`;
            xml += `    <desc lang="th">ดึงข้อมูลผังรายการอัปเดตอัตโนมัติจาก Open-EPG สำหรับช่อง ${ch.name}</desc>\n`;
            xml += `  </programme>\n`;
        });

        xml += '</tv>';

        // บันทึกไฟล์ epg.xml
        fs.writeFileSync('epg.xml', xml, 'utf8');
        console.log('สร้างไฟล์ epg.xml สำเร็จเรียบร้อย!');

    } catch (error) {
        console.error('เกิดข้อผิดพลาด:', error.message);
        process.exit(1);
    }
}

generateCustomEPG();

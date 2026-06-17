const express = require('express');
const multer = require('multer');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module-free');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());

// خيارات إعداد الصورة داخل ملف الوورد
const imageOptions = {
    centered: false,
    getImage: function (tagValue) {
        return fs.readFileSync(tagValue);
    },
    getSize: function (img, tagValue, tagName) {
        // تحديد أبعاد الصورة بالزي العسكري (عرض 120 وارتفاع 150 بكسل)
        return [120, 150];
    }
};

app.post('/generate-doc', upload.single('studentPhoto'), async (req, res) => {
    try {
        // 1. قراءة قالب ملف الوورد الأصلي الخاص بك
        const templatePath = path.join(__dirname, 'استمارة المعلومات الشخصية.docx');
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);

        // 2. معالجة وتجهيز الصورة المرفوعة بواسطة الطالب
        let photoPath = '';
        if (req.file) {
            photoPath = path.join(__dirname, 'uploads', `processed_${req.file.filename}.png`);
            await sharp(req.file.path)
                .png()
                .toFile(photoPath);
        }

        // 3. تجهيز أداة الدمج والإسقاط داخل الوورد
        const imageModule = new ImageModule(imageOptions);
        const doc = new Docxtemplater(zip, {
            modules: [imageModule],
            paragraphLoop: true,
            linebreaks: true,
        });

        // 4. إسقاط البيانات القادمة من الاستمارة داخل الأقواس المخصصة في الملف
        doc.render({
            studentPhoto: photoPath,
            statNum: req.body.statNum || '',
            rank: "طالب",
            classType: req.body.classType,
            fullName: req.body.fullName,
            currentUnit: "ف.تد.ط.الاول - ك . ك . ع. الرابعة.",
            appointmentOrder: req.body.appointmentOrder,
            armyJoinDate: req.body.armyJoinDate,
            collegeJoinDate: req.body.collegeJoinDate,
            prevUnit: req.body.prevUnit,
            birthPlaceDate: req.body.birthPlaceDate,
            birthPlace: req.body.birthPlace,
            nationality: req.body.nationality || 'عربية',
            religion: req.body.religion || 'مسلم',
            sect: req.body.sect || '',
            bloodType: req.body.bloodType,
            maritalStatus: req.body.maritalStatus,
            wifeName: req.body.wifeName || '-',
            childrenCount: req.body.childrenCount || '0',
            nationalId: req.body.nationalId,
            nationalIdDate: req.body.nationalIdDate,
            housingCardNum: req.body.housingCardNum,
            rationCardNum: req.body.rationCardNum,
            address: req.body.address,
            phone: req.body.phone,
            parentPhone: req.body.parentPhone,
            milCertificates: req.body.milCertificates || '-',
            civCertificates: req.body.civCertificates || '-',
            hasInjury: req.body.hasInjury,
            disabilityRate: req.body.disabilityRate || '-'
        });

        // 5. توليد وحفظ ملف الوورد الجديد الممتلئ بالبيانات
        const buf = doc.getZip().generate({ type: 'nodebuffer' });
        
        // تنظيف الملفات المؤقتة من السيرفر
        if (req.file) fs.unlinkSync(req.file.path);
        if (photoPath) fs.unlinkSync(photoPath);

        // إرسال الملف فوراً كتحميل مباشر لجهاز الطالب
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=form_${encodeURIComponent(req.body.fullName)}.docx`);
        res.send(buf);

    } catch (error) {
        console.error(error);
        res.status(500).send('حدث خطأ أثناء توليد ملف الوورد على السيرفر.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`السيرفر يعمل بنجاح على المنفذ ${PORT}`));

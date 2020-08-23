import $ from 'jquery';
import {PDFDocument, StandardFonts, rgb, degrees} from 'pdf-lib';
import qr from 'qr-image';
import FileSaver from 'file-saver';
import printJS from 'print-js';

$(() => {
	let $container;

	/**
	 * @param title string
	 * @param pdfUrl string
	 * @param fields array
	 * @param qrData array
	 * @returns {Promise<void>}
	 */
	window.createPdf = async function (title, pdfUrl, fields, qrDataArr, $cont) {
		if ($cont === undefined) {
			$container = $('#demovox-pdf');
		} else {
			$container = $cont;
		}
		showContainer('loading');

		const xhr = new XMLHttpRequest();
		xhr.open('GET', pdfUrl, true);
		xhr.responseType = 'arraybuffer';
		xhr.onload = async function () {
			if (this.status === 200) {
				// response is unsigned 8 bit integer
				if (typeof this.response !== 'object' || this.response.constructor !== ArrayBuffer) {
					track('downloaded file is defective');
					showContainer('error', '<strong>PDF invalid</strong> Please try again later or contact the site owner, who should check the JavaScript console');
					console.error('Loaded PDF is invalid. Url: ' + pdfUrl);
					return;
				}
				try {
					let pdfData = new Uint8Array(this.response),
						pdfDoc = await editPdf(pdfData, fields, qrDataArr);
					await embedPdf(title, pdfDoc);
					showContainer('ok');
				} catch (e) {
					track('generation failed');
					showContainer('error', '<strong>PDF generation failed</strong> Please try again later or contact the site owner');
					console.error(e);
				}
			} else {
				track('download failed (' + this.status + ')');
				showContainer('error', '<strong>PDF download failed</strong> Please try again later or contact the site owner');
				console.error('Could not load PDF. HTTP status: ' + this.status + ' Url: ' + pdfUrl);
			}
		};
		xhr.onerror = async function () {
			track('download failed (Network error)');
			showContainer('error', '<strong>PDF download failed</strong> Please try again later or contact the site owner, who should check the JavaScript console');
			console.error('Could not load PDF. Network error, for example server was not found or CORS error occurred. Url: ' + pdfUrl);
		};

		xhr.send();
	};

	/**
	 * @param containerName string
	 * @param replaceContent undefined|string
	 */
	function showContainer(containerName, replaceContent) {
		$container.find('.demovox-pdf-loading, .demovox-pdf-error, .demovox-pdf-ok').addClass('hidden');
		const $el = $container.find('.demovox-pdf-' + containerName);
		$el.removeClass('hidden');
		if (replaceContent !== undefined) {
			$el.html(replaceContent);
		}
	}

	/**
	 * @param pdfData Promise<ArrayBuffer>
	 * @param fields array
	 * @param qrData array
	 * @returns {Promise<PDFDocument>}
	 */
	async function editPdf(pdfData, fields, qrDataArr) {
		const pdfDoc = await PDFDocument.load(pdfData),
			helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

		const pages = pdfDoc.getPages(), page = pages[0];
		page.setFont(helveticaFont);

		$.each(
			fields, function (index, value) {
				page.drawText((value.drawText), {
					x: value.x,
					y: value.y,
					size: value.size,
					font: helveticaFont,
					color: rgb(value.color[0], value.color[1], value.color[2]),
					rotate: degrees(value.rotate),
				});
			}
		);
		if (qrDataArr) {
			for(var index = 0; index < qrDataArr.length; index++) {
				var qrData = qrDataArr[index];
				let pngBytes = createQrPng(qrData.text, qrData.size),
					pngImage = await pdfDoc.embedPng(pngBytes);
	
				page.drawImage(pngImage, {
					x: qrData.x,
					y: qrData.y,
					width: pngImage.width,
					height: pngImage.height,
					rotate: degrees(qrData.rotate),
				});
	
				page.drawText(qrData.text, {
					x: qrData.textX,
					y: qrData.textY,
					size: qrData.textSize,
					font: helveticaFont,
					color: rgb(qrData.textColor[0], qrData.textColor[1], qrData.textColor[2]),
					rotate: degrees(qrData.textRotate),
				});
			}
		}
		return pdfDoc;
	}

	/**
	 * @param qrText string
	 * @param size
	 * @returns {*}
	 */
	function createQrPng(qrText, size) {
		return qr.imageSync(qrText, {
			type: 'png',
			ec_level: 'L',
			size: size
		});
	}

	/**
	 * @param msg string
	 */
	function track(value) {
		if (demovoxData.analyticsMatomo) {
			if(_paq === undefined){
				console.error('Matomo script was not found on the page, please disable this option in demovox settings');
				return;
			}
			_paq.push(['trackEvent', 'demovox', 'pdf', value]);
		}
	}

	/**
	 * @param title string
	 * @param pdfDoc {PDFDocument}
	 * @returns {Promise<void>}
	 */
	async function embedPdf(title, pdfDoc) {
		let data = new Int8Array(await pdfDoc.save()),
			blob = new Blob([data], {type: "application/pdf"});

		if ($container.find('.pdf-print').length) {
			let b64 = await pdfDoc.saveAsBase64();
			$container.find('.pdf-print').click(function () {
				try {
					printJS({printable: b64, type: 'pdf', base64: true,});
					track('print');
				} catch (e) {
					track('print failed');
					console.log(e, blob);
					throw 'PDFError';
				}
			});
		}

		if ($container.find('.pdf-download').length) {
			let filename = title.replace(' ', '_') + '.pdf';
			$container.find('.pdf-download').click(function () {
				FileSaver.saveAs(blob, filename);
				track('save');
			});
		}

		if ($container.find('.pdf-iframe').length) {
			let url = window.URL.createObjectURL(blob);
			$container.find('.pdf-iframe').prop('src', url).show();
			track('show in iFrame');
		}
	}
});
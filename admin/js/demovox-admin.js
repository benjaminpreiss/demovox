import demovoxChart from 'chart.js'

var fontSize, textColor = [0, 0, 0], fontFamily = 'Helvetica';

(function ($) {
	'use strict';

	var $input;
	$(function () {
		var demovoxMediaUploader;
		$('.demovox .uploadButton').click(function (e) {
			e.preventDefault();
			$input = $('#' + $(this).data('inputId'));
			// If the uploader object has already been created, reopen the dialog.
			if (demovoxMediaUploader) {
				demovoxMediaUploader.open();
				return;
			}
			// Extend the wp.media object.
			demovoxMediaUploader = wp.media.frames.file_frame = wp.media({
				// Set the values through wp_localize_script so that they can be localised/translated.
				title: demovoxData.uploader.title,
				button: {
					text: demovoxData.uploader.text
				}, multiple: false
			});
			// When a file is selected, grab the URL and set it as the fields value.
			demovoxMediaUploader.on('select', function () {
				var attachment = demovoxMediaUploader.state().get('selection').first().toJSON();
				$input.val(attachment.url);
			});
			// Open the uploader dialog.
			demovoxMediaUploader.open();
		});

		fontSize = parseInt($('#demovox_fontsize').val());
		$('.demovox .showPdf').click(function () {
			fields = [];
			var $container = $(this).closest('div'),
				lang = $(this).data('lang'),
				qrMode = $('#demovox_field_qr_mode').val(),
				pdfUrl = $('#demovox_signature_sheet_' + lang).val(),
				admin = demovoxAdminClass,
				fields = fields.concat(
					admin.createJsonFields('BE', 'canton', lang),
					admin.createJsonFields('Bern', 'commune', lang),
					admin.createJsonFields('3001', 'zip', lang),
					admin.createJsonFields('21', 'birthdate_day', lang),
					admin.createJsonFields('10', 'birthdate_month', lang),
					admin.createJsonFields('88', 'birthdate_year', lang),
					admin.createJsonFields('Theaterplatz 4', 'street', lang),
				),
				qrDataArr = qrMode === 'disabled'
					? null
					: admin.createJsonQrData(lang, "JNXWE", fontSize, textColor);
			createPdf('preview', pdfUrl, fields, qrDataArr, $container);
		});
		initDemovoxAjaxButton($('.demovox'));

		$("input.demovox_field_json").each(function(index) {
			var $row = $(this).parent(),
				$field = $(this),
				jsonString = $field.val(),
				$group = $row.find('.demovox_field_group'),
				$linkedFields = $("input.linked_fields"),
				$fieldLang = $field.data("lang"),
				$remainingFields = $linkedFields.not($field).filter("[data-lang='" + $fieldLang + "']");
		
			if (jsonString) {
				var jsonArray = JSON.parse(jsonString);
				jsonArray.forEach((value) => {
					createGroup($row, $group, value.x, value.y, value.rot);
					$row.find('.demovox_field_group:first').remove();
				})
				if(jsonArray.length) {
					$group.hide();
				}
			}
		
			$row.find('.demovox_field_group_add').on('click', function() {
				createGroup($row, $group);
				genJson($row, $field);
				if ($remainingFields.size() === 1) {
					var $remainingRow = $remainingFields.parent(),
						$remainingGroup = $remainingRow.find('.demovox_field_group:last');
					createGroup($remainingRow, $remainingGroup);
					genJson($remainingRow, $remainingFields);
				}
			});
			$row.find('.demovox_field_group_remove').on('click', function() {
				var $groups = $row.find('.demovox_field_group');
				if ($groups.size() > 1) {
					$groups.last().remove();
					genJson($row, $field);
					if ($remainingFields.size() === 1) {
						var $remainingRow = $remainingFields.parent();
						$remainingRow.find('.demovox_field_group:last').remove();
						genJson($remainingRow, $remainingFields);
					}
				}
			});
			$row.on('change', '.demovox_field_group input, .demovox_field_group select', function() {
				genJson($row, $field);
			});
		});
	});

	function initDemovoxAjaxButton($container) {
		$container.find('.ajaxButton').click(function () {
			var cont = $(this).data('container'),
				ajaxUrl = $(this).data('ajax-url'),
				confirmTxt = $(this).data('confirm'),
				$ajaxContainer = $(this).parent().find(cont ? cont : '.ajaxContainer');
			if(!$ajaxContainer.length){
				if (cont) {
					$ajaxContainer = $(cont);
				}
				if (!$ajaxContainer.length) {
					console.error('initDemovoxAjaxButton: $ajaxContainer not found', $ajaxContainer);
					return;
				}
			}
			if (typeof confirmTxt !== 'undefined' && !confirm(confirmTxt)) {
				return;
			}
			$ajaxContainer.css('cursor', 'progress');
			$ajaxContainer.html('Loading...');
			$.get(ajaxUrl)
				.done(function (data) {
					$ajaxContainer.html(data);
					initDemovoxAjaxButton($ajaxContainer);
				})
				.fail(function () {
					$ajaxContainer.html('Error');
				})
				.always(function () {
					$ajaxContainer.css('cursor', 'auto');
				});
		});
	}
		
	function createGroup($row, $group, x, y, rot) {
		var $lastGroup = $row.find('.demovox_field_group:last'),
			$created = $group.clone().insertAfter($lastGroup);
		if (typeof x === 'undefined') {
			$created.find('.demovox_field_x').val($lastGroup.find('.demovox_field_x').val());
			$created.find('.demovox_field_y').val($lastGroup.find('.demovox_field_y').val());
			$created.find('.demovox_field_rot').val($lastGroup.find('.demovox_field_rot').val());
		} else {
			$created.find('.demovox_field_x').val(x);
			$created.find('.demovox_field_y').val(y);
			$created.find('.demovox_field_rot').val(rot);
		}
		$created.show();
	}
	
	function genJson($row, $field) {
		var values = [];
		$row.find('.demovox_field_group').each(function(index) {
			var $group = $(this),
				x = $group.find('.demovox_field_x').val(),
				y = $group.find('.demovox_field_y').val(),
				rot = $group.find('.demovox_field_rot').val();
			if (x == '' || y == '' || rot == '') {
				return;
			}
			values.push({
				x: Number(x),
				y: Number(y),
				rot: Number(rot)
			});
		});
		$field.val(JSON.stringify(values));
	}

	var demovoxAdminClass = {
		createJsonQrData: function (lang, text, fontSize, textColor) {
			var fields = [];
			var jsonQrImg = this.getJsonField('qr_img_' + lang + '_json'),
				jsonQrText = this.getJsonField('qr_text_' + lang + '_json'),
				posArrQrImg = JSON.parse(jsonQrImg),
				posArrQrText = JSON.parse(jsonQrText);

			posArrQrImg.forEach((pos, index) => {
				var x = pos.x,
					y = pos.y,
					rotate = pos.rot,
					textX = posArrQrText[index].x,
					textY = posArrQrText[index].y,
					textRotate = posArrQrText[index].rot;
				fields = fields.concat([{
					"text": text,
					"x": x,
					"y": y,
					"rotate": rotate,
					"size": this.getField('qr_img_size_' + lang),
					"textX": textX,
					"textY": textY,
					"textRotate": textRotate,
					"textSize": fontSize,
					"textColor": textColor
				}])
			})
			return fields;
		},
		getField: function(name) {
			return parseInt($('#demovox_field_' + name).val())
		},
		getJsonField: function (name) {
			return $('#demovox_field_' + name).val()
		},
		createJsonFields: function (value, name, lang) {
			var fields = [];
			var json = this.getJsonField(name + '_' + lang + '_json'),
				posArr = JSON.parse(json);
			posArr.forEach((pos) => {
				var x = pos.x,
					y = pos.y,
					rotate = pos.rot;
				fields = fields.concat([
					{
						"drawText": value,
						"x": x,
						"y": y,
						"rotate": rotate,
						"size": fontSize,
						"font": fontFamily,
						"color": textColor
					}
				])
			})
			return fields;
		},
		setOnVal: function ($check, $set, checkValue, setValue) {
			if ($check.is("input")) {
				$check.keyup(function () {
					if ($(this).val() === checkValue) {
						$set.val(setValue).change();
					}
				});
			}
			$check.change(function () {
				if ($(this).val() === checkValue) {
					$set.val(setValue).change();
				}
			});
			if ($check.val() === checkValue) {
				$set.val(setValue).change();
			}
		},
		showOnVal: function ($check, $showHide, value, invert) {
			var self = this;
			var invert = (invert !== undefined) ? invert : false;
			if ($check.is("input")) {
				$check.keyup(function () {
					self.showHideEl($showHide, self.isIn($(this).val(), value), invert);
				});
			}
			$check.change(function () {
				self.showHideEl($showHide, self.isIn($(this).val(), value), invert);
			});
			self.showHideEl($showHide, $check.val() === value, invert);
		},
		hideOnVal: function ($check, $showHide, value) {
			this.showOnVal($check, $showHide, value, true);
		},
		showOnChecked: function ($check, $showHide, invert) {
			var self = this;
			var invert = (invert !== undefined) ? invert : false;
			$check.change(function () {
				self.showHideEl($showHide, $(this).is(':checked'), invert);
			});
			self.showHideEl($showHide, $check.is(':checked'), invert);
		},
		hideOnChecked: function ($check, $showHide) {
			this.showOnVal($check, $showHide, true);
		},
		isIn: function (needle, haystack) {
			if (Array.isArray(haystack)) {
				return haystack.indexOf(needle) !== -1;
			} else {
				return needle === haystack;
			}
		},
		showHideEl: function ($els, show, invert) {
			var invert = (invert !== undefined) ? invert : false;
			if ((show && !invert) || (!show && invert)) {
				var $el;
				$els.each(function () {
					$el = $(this);
					if (!$el.hasClass('hidden')) {
						$el.show();
					}
				});
			} else {
				$els.hide();
			}
		},
		nDate: function (year, month, day) {
			var monthIndex = month - 1;
			return new Date(year, monthIndex, day);
		}
	};
	global.demovoxAdminClass = demovoxAdminClass;
})(jQuery);

global.demovoxChart = demovoxChart;
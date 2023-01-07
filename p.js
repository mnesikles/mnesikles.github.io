function show_help(options) {
	const $help_window = $Window({
		title: options.title || "Help Topics",
		icons: iconsAtTwoSizes("chm"),
		resizable: true,
	})
	$help_window.addClass("help-window");

	let ignore_one_load = true;
	let back_length = 0;
	let forward_length = 0;

	const $main = $(E("div")).addClass("main");
	const $toolbar = $(E("div")).addClass("toolbar");
	const add_toolbar_button = (name, sprite_n, action_fn, enabled_fn) => {
		const $button = $("<button class='lightweight'>")
			.append($("<span>").text(name))
			.appendTo($toolbar)
			.on("click", () => {
				action_fn();
			});
		$("<div class='icon'/>")
			.appendTo($button)
			.css({
				backgroundPosition: `${-sprite_n * 55}px 0px`,
			});
		const update_enabled = () => {
			$button[0].disabled = enabled_fn && !enabled_fn();
		};
		update_enabled();
		$help_window.on("click", "*", update_enabled);
		$help_window.on("update-buttons", update_enabled);
		return $button;
	};
	const measure_sidebar_width = () =>
		$contents.outerWidth() +
		parseFloat(getComputedStyle($contents[0]).getPropertyValue("margin-left")) +
		parseFloat(getComputedStyle($contents[0]).getPropertyValue("margin-right")) +
		$resizer.outerWidth();
	const $hide_button = add_toolbar_button("Hide", 0, () => {
		const toggling_width = measure_sidebar_width();
		$contents.hide();
		$resizer.hide();
		$hide_button.hide();
		$show_button.show();
		$help_window.width($help_window.width() - toggling_width);
		$help_window.css("left", $help_window.offset().left + toggling_width);
	});
	const $show_button = add_toolbar_button("Show", 5, () => {
		$contents.show();
		$resizer.show();
		$show_button.hide();
		$hide_button.show();
		const toggling_width = measure_sidebar_width();
		$help_window.width($help_window.width() + toggling_width);
		$help_window.css("left", $help_window.offset().left - toggling_width);
		// $help_window.applyBounds() would push the window to fit (before trimming it only if needed)
		// Trim the window to fit (especially for if maximized)
		if ($help_window.offset().left < 0) {
			$help_window.width($help_window.width() + $help_window.offset().left);
			$help_window.css("left", 0);
		}
	}).hide();
	add_toolbar_button("Back", 1, () => {
		$iframe[0].contentWindow.history.back();
		ignore_one_load = true;
		back_length -= 1;
		forward_length += 1;
	}, () => back_length > 0);
	add_toolbar_button("Forward", 2, () => {
		$iframe[0].contentWindow.history.forward();
		ignore_one_load = true;
		forward_length -= 1;
		back_length += 1;
	}, () => forward_length > 0);
	add_toolbar_button("Options", 3, () => { }, () => false); // TODO: hotkey and underline on O
	add_toolbar_button("Web Help", 4, () => {
		iframe.src = "help/online_support.htm";
	});

	const $iframe = $("<iframe sandbox='allow-same-origin allow-scripts allow-forms allow-modals allow-popups allow-downloads'>")
		.attr({ src: "help/default.html" })
		.addClass("inset-deep");
	const iframe = $iframe[0];
	enhance_iframe(iframe);
	iframe.$window = $help_window; // for focus handling integration
	const $resizer = $(E("div")).addClass("resizer");
	const $contents = $(E("ul")).addClass("contents inset-deep");

	// TODO: fix race conditions
	$iframe.on("load", () => {
		if (!ignore_one_load) {
			back_length += 1;
			forward_length = 0;
		}
		iframe.contentWindow.location.href
		ignore_one_load = false;
		$help_window.triggerHandler("update-buttons");
	});

	$main.append($contents, $resizer, $iframe);
	$help_window.$content.append($toolbar, $main);

	$help_window.css({ width: 800, height: 600 });

	$iframe.attr({ name: "help-frame" });
	$iframe.css({
		backgroundColor: "white",
		border: "",
		margin: "1px",
	});
	$contents.css({
		margin: "1px",
	});
	$help_window.center();

	$main.css({
		position: "relative", // for resizer
	});

	const resizer_width = 4;
	$resizer.css({
		cursor: "ew-resize",
		width: resizer_width,
		boxSizing: "border-box",
		background: "var(--ButtonFace)",
		borderLeft: "1px solid var(--ButtonShadow)",
		boxShadow: "inset 1px 0 0 var(--ButtonHilight)",
		top: 0,
		bottom: 0,
		zIndex: 1,
	});
	$resizer.on("pointerdown", (e) => {
		let pointermove, pointerup;
		const getPos = (e) =>
			Math.min($help_window.width() - 100, Math.max(20,
				e.clientX - $help_window.$content.offset().left
			));
		$G.on("pointermove", pointermove = (e) => {
			$resizer.css({
				position: "absolute",
				left: getPos(e)
			});
			$contents.css({
				marginRight: resizer_width,
			});
		});
		$G.on("pointerup", pointerup = (e) => {
			$G.off("pointermove", pointermove);
			$G.off("pointerup", pointerup);
			$resizer.css({
				position: "",
				left: ""
			});
			$contents.css({
				flexBasis: getPos(e) - resizer_width,
				marginRight: "",
			});
		});
	});

	const parse_object_params = $object => {
		// parse an $(<object>) to a plain object of key value pairs
		const object = {};
		for (const param of $object.children("param").get()) {
			object[param.name] = param.value;
		}
		return object;
	};

	let $last_expanded;

	const make_$item = text => {
		const $item = $(E("div")).addClass("item").text(text);
		$item.on("mousedown", () => {
			$contents.find(".item").removeClass("selected");
			$item.addClass("selected");
		});
		$item.on("click", () => {
			const $li = $item.parent();
			if ($li.is(".folder")) {
				if ($last_expanded) {
					$last_expanded.not($li).removeClass("expanded");
				}
				$li.toggleClass("expanded");
				$last_expanded = $li;
			}
		});
		return $item;
	};

	const $default_item_li = $(E("li")).addClass("page");
	$default_item_li.append(make_$item("Welcome to Help").on("click", () => {
		$iframe.attr({ src: "help/default.html" });
	}));
	$contents.append($default_item_li);

	function renderItemFromContents(source_li, $folder_items_ul) {
		const object = parse_object_params($(source_li).children("object"));
		if ($(source_li).find("li").length > 0) {

			const $folder_li = $(E("li")).addClass("folder");
			$folder_li.append(make_$item(object.Name));
			$contents.append($folder_li);

			const $folder_items_ul = $(E("ul"));
			$folder_li.append($folder_items_ul);

			$(source_li).children("ul").children().get().forEach((li) => {
				renderItemFromContents(li, $folder_items_ul);
			});
		} else {
			const $item_li = $(E("li")).addClass("page");
			$item_li.append(make_$item(object.Name).on("click", () => {
				$iframe.attr({ src: `${options.root}/${object.Local}` });
			}));
			if ($folder_items_ul) {
				$folder_items_ul.append($item_li);
			} else {
				$contents.append($item_li);
			}
		}
	}

	$.get(options.contentsFile, hhc => {
		$($.parseHTML(hhc)).filter("ul").children().get().forEach((li) => {
			renderItemFromContents(li, null);
		});
	});

	// @TODO: keyboard accessability
	// $help_window.on("keydown", (e)=> {
	// 	switch(e.keyCode){
	// 		case 37:
	// 			show_error_message("MOVE IT");
	// 			break;
	// 	}
	// });
	var task = new Task($help_window);
	task.$help_window = $help_window;
	return task;
}

function Paint(file_path) {
	var $win = make_iframe_window({
		src: "programs/jspaint/index.html",
		icons: iconsAtTwoSizes("paint"),
		// NOTE: in Windows 98, "untitled" is lowercase, but TODO: we should just make it consistent
		title: "untitled - Paint",
		outerWidth: 275,
		outerHeight: 400,
		minOuterWidth: 275,
		minOuterHeight: 400,
	});

	var contentWindow = $win.$iframe[0].contentWindow;

	var waitUntil = function (test, interval, callback) {
		if (test()) {
			callback();
		} else {
			setTimeout(waitUntil, interval, test, interval, callback);
		}
	};

	const systemHooks = {
		readBlobFromHandle: (file_path) => {
			return new Promise((resolve, reject) => {
				withFilesystem(() => {
					var fs = BrowserFS.BFSRequire("fs");
					fs.readFile(file_path, (err, buffer) => {
						if (err) {
							return reject(err);
						}
						const byte_array = new Uint8Array(buffer);
						const blob = new Blob([byte_array]);
						const file_name = file_path.replace(/.*\//g, "");
						const file = new File([blob], file_name);
						resolve(file);
					});
				});
			});
		},
		writeBlobToHandle: async (file_path, blob) => {
			const arrayBuffer = await blob.arrayBuffer();
			return new Promise((resolve, reject) => {
				withFilesystem(()=> {
					const fs = BrowserFS.BFSRequire("fs");
					const { Buffer } = BrowserFS.BFSRequire("buffer");
					const buffer = Buffer.from(arrayBuffer);
					fs.writeFile(file_path, buffer, (err)=> {
						if (err) {
							return reject(err);
						}
						resolve();
					});
				});
			});
		},
		setWallpaperCentered: (canvas) => {
			canvas.toBlob((blob) => {
				setDesktopWallpaper(blob, "no-repeat", true);
			});
		},
		setWallpaperTiled: (canvas) => {
			canvas.toBlob((blob) => {
				setDesktopWallpaper(blob, "repeat", true);
			});
		},
	};

	// it seems like I should be able to use onload here, but when it works (overrides the function),
	// it for some reason *breaks the scrollbar styling* in jspaint
	// I don't know what's going on there

	// contentWindow.addEventListener("load", function(){
	// $(contentWindow).on("load", function(){
	// $win.$iframe.load(function(){
	// $win.$iframe[0].addEventListener("load", function(){
	waitUntil(()=> contentWindow.systemHooks, 500, ()=> {
		Object.assign(contentWindow.systemHooks, systemHooks);

		let $help_window;
		contentWindow.show_help = () => {
			if ($help_window) {
				$help_window.focus();
				return;
			}
			$help_window = show_help({
				title: "Paint Help",
				contentsFile: "programs/jspaint/help/mspaint.hhc",
				root: "programs/jspaint/help",
			}).$help_window;
			$help_window.on("close", () => {
				$help_window = null;
			});
		};

		if (file_path) {
			// window.initial_system_file_handle = ...; is too late to set this here
			// contentWindow.open_from_file_handle(...); doesn't exist
			systemHooks.readBlobFromHandle(file_path).then(file => {
				if (file) {
					contentWindow.open_from_file(file, file_path);
				}
			}, (error) => {
				// this handler may not always called for errors, sometimes error message is shown via readBlobFromHandle
				contentWindow.show_error_message(`Failed to open file ${file_path}`, error);
			});
		}

		var old_update_title = contentWindow.update_title;
		contentWindow.update_title = () => {
			old_update_title();
			$win.title(contentWindow.document.title);
		};
	});

	return new Task($win);
}
Paint.acceptsFilePaths = true;

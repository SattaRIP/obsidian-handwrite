const { Plugin, WorkspaceLeaf, ItemView, Notice, Modal, PluginSettingTab, Setting } = require('obsidian');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);

const VIEW_TYPE_CALLIGRAPHY = 'calligraphy-canvas-view';

// Calligraphy Canvas View
class CalligraphyCanvasView extends ItemView {
	constructor(leaf, plugin) {
		super(leaf);
		this.plugin = plugin;
		this.settings = plugin ? plugin.settings : DEFAULT_SETTINGS;
		this.selectionColor = this.settings.selectionColor || DEFAULT_SETTINGS.selectionColor;
		this.canvas = null;
		this.ctx = null;
		this.linesCanvas = null; // Separate canvas for ruled lines
		this.linesCtx = null;
		this.isDrawing = false;
		this.lastX = 0;
		this.lastY = 0;
		this.lastTime = 0;
		this.penType = 'regular'; // regular, calligraphy, fountain, pencil
		// Pen color will be set based on theme in onViewCreated
		this.penColor = '#FFFFFF'; // Default to white (common for dark mode)
		this.baseLineWidth = 3; // Default pen size
		this.strokes = [];
		this.currentStroke = [];
		this.editMode = false;
		this.originalText = null;
		this.originalSelection = null;
		this.wordSpacing = 40;
		this.lineSpacing = 50;
		this.textRegions = [];
		this.drawingMode = true; // Handwriting mode (default ON)
		this.eraserMode = false; // Toggle eraser mode
		this.panMode = false; // Pan mode for moving canvas view
		this.moveMode = false; // Move mode for selecting and moving objects
		this.isDarkMode = this.detectDarkMode(); // Initialize based on Obsidian theme
		this.canvasDarkMode = null; // null = auto (follow Obsidian), true/false = manual override
		this.autoPenColor = true; // Auto-switch pen color with theme
		this.history = [];
		this.historyStep = -1;
		this.canvasScale = 1;
		this.zoomLevel = 1; // Canvas zoom level
		this.panOffsetX = 0; // Pan offset
		this.panOffsetY = 0;
		this.isPanning = false;
		this.showLines = true; // Lines on by default
		this.lineHeight = 30;
		this.lineGap = 40;
		this.calligraphyAngle = 45; // Nib angle in degrees
		this.contextMenuX = 0; // Track right-click position
		this.contextMenuY = 0;
		this.fontSize = 36; // Default font size for pasted text
		this.textObjects = []; // Store text objects for selection/editing
		this.selectedTextIndex = -1; // Currently selected text object
		this.selectedStrokeIndex = -1; // Currently selected stroke group
		this.isDraggingObject = false; // Is dragging a selected object
		this.dragStartX = 0;
		this.dragStartY = 0;
		this.isPartialSelection = false; // Whether text is partially selected (character-level)
		this.partialSelectionChars = []; // Array of character indices for partial selection
		this.contextMenu = null; // Reference to context menu element
		this.redrawScheduled = false; // Flag to prevent redundant redraws
		this.isDraggingSelection = false; // Dragging selection rectangle
		this.dragSelectionStart = { x: 0, y: 0 }; // Selection rectangle start
		this.dragSelectionEnd = { x: 0, y: 0 }; // Selection rectangle end
		this.selectedTextIndices = []; // Multiple selected text objects
		this.selectedStrokeIndices = []; // Multiple selected strokes
	}

	detectDarkMode() {
		// Check if Obsidian is in dark mode
		return document.body.classList.contains('theme-dark');
	}

	getEffectiveDarkMode() {
		// Return manual override if set, otherwise auto-detect
		if (this.canvasDarkMode !== null) {
			return this.canvasDarkMode;
		}
		return this.detectDarkMode();
	}

	applyCanvasTheme(darkModeBtn = null) {
		// Apply dark/light theme to canvas background
		const isDark = this.getEffectiveDarkMode();
		this.isDarkMode = isDark;

		// Update canvas backgrounds
		if (this.linesCanvas) {
			this.linesCanvas.style.backgroundColor = isDark ? '#000000' : '#ffffff';
		}

		// Update pen color if auto pen color is enabled
		if (this.autoPenColor) {
			this.penColor = isDark ? '#FFFFFF' : '#000000';
			// Update color picker to reflect the new pen color
			if (this.colorPicker) {
				this.colorPicker.value = this.penColor;
			}
			// Update simple color buttons if using them
			if (this.colorButtons) {
				this.colorButtons.querySelectorAll('.simple-color-btn').forEach(btn => {
					const btnColor = btn.style.backgroundColor;
					const rgb = btnColor.match(/\d+/g);
					const hex = rgb ? '#' + rgb.map(x => parseInt(x).toString(16).padStart(2, '0')).join('').toUpperCase() : '#000000';
					btn.style.border = hex === this.penColor ? '2px solid var(--interactive-accent)' : '1px solid var(--background-modifier-border)';
				});
			}
		}

		// Update button styling to match canvas
		if (darkModeBtn) {
			darkModeBtn.style.backgroundColor = isDark ? '#000000' : '#ffffff';
			darkModeBtn.style.color = isDark ? '#ffffff' : '#000000';
			darkModeBtn.style.borderColor = isDark ? '#444444' : '#cccccc';
		}

		// Redraw lines with new theme
		if (this.showLines) {
			this.drawRuledLines();
		}
	}

	getViewType() {
		return VIEW_TYPE_CALLIGRAPHY;
	}

	getDisplayText() {
		return 'Calligraphy Canvas';
	}

	getIcon() {
		return 'pen-tool';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('calligraphy-canvas-container');

		// Toolbar
		const toolbar = container.createDiv({ cls: 'calligraphy-toolbar' });

		// Pen type selector
		const penTypeContainer = toolbar.createDiv({ cls: 'pen-type-control' });
		penTypeContainer.createEl('span', { text: 'Pen Type: ' });
		const penTypeSelect = penTypeContainer.createEl('select', { cls: 'pen-type-select' });

		const penTypes = [
			{ value: 'regular', label: 'Regular Pen' },
			{ value: 'calligraphy', label: 'Calligraphy Pen' },
			{ value: 'fountain', label: 'Fountain Pen' },
			{ value: 'pencil', label: 'Pencil' }
		];

		penTypes.forEach(type => {
			const option = penTypeSelect.createEl('option', {
				value: type.value,
				text: type.label
			});
		});

		penTypeSelect.value = this.penType;
		penTypeSelect.addEventListener('change', (e) => {
			this.penType = e.target.value;
			new Notice(`Switched to ${penTypes.find(t => t.value === this.penType).label}`);
		});

		// Pen size slider
		const sizeContainer = toolbar.createDiv({ cls: 'size-control' });
		sizeContainer.createEl('span', { text: 'Pen Size: ' });
		const sizeSlider = sizeContainer.createEl('input', {
			type: 'range',
			attr: { min: '1', max: '10', value: '3' }
		});
		const sizeValue = sizeContainer.createEl('span', { text: '3' });
		sizeSlider.addEventListener('input', (e) => {
			this.baseLineWidth = parseInt(e.target.value);
			sizeValue.setText(e.target.value);
		});

		// Color picker - simple or full based on settings
		const colorContainer = toolbar.createDiv({ cls: 'color-control' });
		colorContainer.createEl('span', { text: 'Color: ' });

		if (this.settings.enableFullColorPicker) {
			// Full color picker for those who want it
			this.colorPicker = colorContainer.createEl('input', {
				type: 'color',
				attr: { value: this.penColor }
			});
			this.colorPicker.addEventListener('change', (e) => {
				this.penColor = e.target.value;
			});
		} else {
			// Simple color buttons for handwriting (ONLY white/black/greys - no colors)
			const colorButtons = colorContainer.createDiv({ cls: 'simple-color-buttons' });

			const colors = [
				{ color: '#FFFFFF', label: 'White' },
				{ color: '#BFBFBF', label: 'Light Grey' },
				{ color: '#808080', label: 'Medium Grey' },
				{ color: '#404040', label: 'Dark Grey' },
				{ color: '#000000', label: 'Black' }
			];

			console.log('Handwrite: Creating grey color buttons. Settings:', this.settings);
			console.log('Handwrite: enableFullColorPicker =', this.settings.enableFullColorPicker);

			colors.forEach(({ color, label }) => {
				const btn = colorButtons.createEl('button', {
					cls: 'simple-color-btn',
					attr: { title: label }
				});
				btn.style.backgroundColor = color;
				console.log(`Handwrite: Created button with color ${color}, label ${label}, computed bg:`, btn.style.backgroundColor);
				btn.style.border = color === this.penColor ? '2px solid var(--interactive-accent)' : '1px solid var(--background-modifier-border)';

				btn.addEventListener('click', () => {
					this.penColor = color;
					// Update all button borders
					colorButtons.querySelectorAll('.simple-color-btn').forEach(b => {
						const btnColor = b.style.backgroundColor;
						const rgb = btnColor.match(/\d+/g);
						const hex = rgb ? '#' + rgb.map(x => parseInt(x).toString(16).padStart(2, '0')).join('').toUpperCase() : '#000000';
						b.style.border = hex === color ? '2px solid var(--interactive-accent)' : '1px solid var(--background-modifier-border)';
					});
				});
			});

			// Store reference for theme updates
			this.colorButtons = colorButtons;
		}

		// Font size slider for pasted text
		const fontSizeContainer = toolbar.createDiv({ cls: 'size-control' });
		fontSizeContainer.createEl('span', { text: 'Font Size: ' });
		const fontSizeSlider = fontSizeContainer.createEl('input', {
			type: 'range',
			attr: { min: '8', max: '72', value: '36' }
		});
		const fontSizeValue = fontSizeContainer.createEl('span', { text: '36' });
		fontSizeSlider.addEventListener('input', (e) => {
			this.fontSize = parseInt(e.target.value);
			fontSizeValue.setText(e.target.value);
		});

		// Ruled lines toggle
		const linesBtn = toolbar.createEl('button', {
			text: 'Lines: ON',
			cls: 'lines-btn active'
		});
		linesBtn.addEventListener('click', () => {
			this.showLines = !this.showLines;
			linesBtn.setText(`Lines: ${this.showLines ? 'ON' : 'OFF'}`);
			linesBtn.toggleClass('active', this.showLines);
			this.drawRuledLines();
		});

		// Light/Dark mode toggle
		const darkModeBtn = toolbar.createEl('button', {
			text: this.getEffectiveDarkMode() ? 'Light/Dark: Dark' : 'Light/Dark: Light',
			cls: 'dark-mode-btn'
		});
		darkModeBtn.addEventListener('click', () => {
			if (this.canvasDarkMode === null) {
				// First click: set opposite of current auto-detected mode
				this.canvasDarkMode = !this.detectDarkMode();
			} else {
				// Toggle between manual override and auto
				if (this.canvasDarkMode === this.detectDarkMode()) {
					// Currently matches Obsidian, so turn off override
					this.canvasDarkMode = null;
				} else {
					// Toggle the override
					this.canvasDarkMode = !this.canvasDarkMode;
				}
			}

			const effectiveMode = this.getEffectiveDarkMode();
			darkModeBtn.setText(effectiveMode ? 'Light/Dark: Dark' : 'Light/Dark: Light');
			this.applyCanvasTheme(darkModeBtn);

			const modeText = this.canvasDarkMode === null
				? `Auto (${effectiveMode ? 'Dark' : 'Light'})`
				: (effectiveMode ? 'Dark' : 'Light');
			new Notice(`Canvas theme: ${modeText}`);
		});

		// Auto pen color toggle
		const autoPenColorContainer = toolbar.createDiv({ cls: 'auto-pen-color-control' });
		const autoPenColorCheckbox = autoPenColorContainer.createEl('input', {
			type: 'checkbox',
			cls: 'auto-pen-color-checkbox'
		});
		autoPenColorCheckbox.checked = this.autoPenColor;
		autoPenColorContainer.createEl('span', { text: ' Auto pen color', cls: 'auto-pen-color-label' });
		autoPenColorCheckbox.addEventListener('change', (e) => {
			this.autoPenColor = e.target.checked;
			if (this.autoPenColor) {
				// Apply current theme's pen color
				this.applyCanvasTheme(darkModeBtn);
				new Notice('Pen color will auto-switch with theme');
			} else {
				new Notice('Pen color locked to current color');
			}
		});

		// Apply initial theme styling
		this.applyCanvasTheme(darkModeBtn);

		// Line controls (initially hidden)
		this.lineControlsContainer = toolbar.createDiv({ cls: 'line-controls', attr: { style: 'display: none;' } });

		const lineHeightControl = this.lineControlsContainer.createDiv({ cls: 'size-control' });
		lineHeightControl.createEl('span', { text: 'Line Height: ' });
		const lineHeightSlider = lineHeightControl.createEl('input', {
			type: 'range',
			attr: { min: '10', max: '60', value: '30' }
		});
		const lineHeightValue = lineHeightControl.createEl('span', { text: '30' });
		lineHeightSlider.addEventListener('input', (e) => {
			this.lineHeight = parseInt(e.target.value);
			lineHeightValue.setText(e.target.value);
			if (this.showLines) this.drawRuledLines();
		});

		const lineGapControl = this.lineControlsContainer.createDiv({ cls: 'size-control' });
		lineGapControl.createEl('span', { text: 'Line Gap: ' });
		const lineGapSlider = lineGapControl.createEl('input', {
			type: 'range',
			attr: { min: '20', max: '100', value: '40' }
		});
		const lineGapValue = lineGapControl.createEl('span', { text: '40' });
		lineGapSlider.addEventListener('input', (e) => {
			this.lineGap = parseInt(e.target.value);
			lineGapValue.setText(e.target.value);
			if (this.showLines) this.drawRuledLines();
		});

		// Show line controls when lines are enabled
		linesBtn.addEventListener('click', () => {
			if (this.lineControlsContainer) {
				this.lineControlsContainer.style.display = this.showLines ? 'flex' : 'none';
			}
		});

		// Edit mode spacing controls (initially hidden)
		this.spacingContainer = toolbar.createDiv({ cls: 'spacing-controls', attr: { style: 'display: none;' } });

		const wordSpacingControl = this.spacingContainer.createDiv({ cls: 'size-control' });
		wordSpacingControl.createEl('span', { text: 'Word Space: ' });
		const wordSpacingSlider = wordSpacingControl.createEl('input', {
			type: 'range',
			attr: { min: '20', max: '100', value: '40' }
		});
		const wordSpacingValue = wordSpacingControl.createEl('span', { text: '40' });
		wordSpacingSlider.addEventListener('input', (e) => {
			this.wordSpacing = parseInt(e.target.value);
			wordSpacingValue.setText(e.target.value);
		});

		const lineSpacingControl = this.spacingContainer.createDiv({ cls: 'size-control' });
		lineSpacingControl.createEl('span', { text: 'Line Space: ' });
		const lineSpacingSlider = lineSpacingControl.createEl('input', {
			type: 'range',
			attr: { min: '30', max: '100', value: '50' }
		});
		const lineSpacingValue = lineSpacingControl.createEl('span', { text: '50' });
		lineSpacingSlider.addEventListener('input', (e) => {
			this.lineSpacing = parseInt(e.target.value);
			lineSpacingValue.setText(e.target.value);
		});

		// Reload text button (only shown in edit mode)
		this.reloadBtn = toolbar.createEl('button', {
			text: 'Reload Text',
			cls: 'reload-btn',
			attr: { style: 'display: none;' }
		});
		this.reloadBtn.addEventListener('click', () => {
			if (this.editMode && this.originalText) {
				this.loadTextForEditing(this.originalText, this.originalSelection);
			}
		});

		// Handwriting mode toggle (default ON)
		const drawingBtn = toolbar.createEl('button', {
			text: 'Handwriting: ON',
			cls: 'drawing-btn active'
		});
		drawingBtn.addEventListener('click', () => {
			this.drawingMode = !this.drawingMode;
			drawingBtn.setText(`Handwriting: ${this.drawingMode ? 'ON' : 'OFF'}`);
			drawingBtn.toggleClass('active', this.drawingMode);
			if (this.drawingMode) {
				// Disable eraser, pan, and move modes when handwriting is enabled
				this.eraserMode = false;
				this.panMode = false;
				this.moveMode = false;
				eraserBtn.setText('Eraser: OFF');
				eraserBtn.removeClass('active');
				panBtn.setText('Pan: OFF');
				panBtn.removeClass('active');
				moveBtn.setText('Select/Move: OFF');
				moveBtn.removeClass('active');
				new Notice('Drawing mode enabled');
			} else {
				new Notice('Drawing mode disabled');
			}
			this.updateCursor();
		});

		// Eraser toggle
		const eraserBtn = toolbar.createEl('button', {
			text: 'Eraser: OFF',
			cls: 'eraser-btn'
		});
		eraserBtn.addEventListener('click', () => {
			this.eraserMode = !this.eraserMode;
			eraserBtn.setText(`Eraser: ${this.eraserMode ? 'ON' : 'OFF'}`);
			eraserBtn.toggleClass('active', this.eraserMode);
			if (this.eraserMode) {
				// Disable handwriting, pan, and move modes when eraser is enabled
				this.drawingMode = false;
				this.panMode = false;
				this.moveMode = false;
				drawingBtn.setText('Handwriting: OFF');
				drawingBtn.removeClass('active');
				panBtn.setText('Pan: OFF');
				panBtn.removeClass('active');
				moveBtn.setText('Select/Move: OFF');
				moveBtn.removeClass('active');
				new Notice('Eraser mode enabled');
			} else {
				new Notice('Eraser mode disabled');
			}
			this.updateCursor();
		});

		// Pan mode toggle
		const panBtn = toolbar.createEl('button', {
			text: 'Pan: OFF',
			cls: 'pan-btn'
		});
		panBtn.addEventListener('click', () => {
			this.panMode = !this.panMode;
			panBtn.setText(`Pan: ${this.panMode ? 'ON' : 'OFF'}`);
			panBtn.toggleClass('active', this.panMode);
			if (this.panMode) {
				// Disable handwriting, eraser, and move modes when pan is enabled
				this.drawingMode = false;
				this.eraserMode = false;
				this.moveMode = false;
				drawingBtn.setText('Handwriting: OFF');
				drawingBtn.removeClass('active');
				eraserBtn.setText('Eraser: OFF');
				eraserBtn.removeClass('active');
				moveBtn.setText('Select/Move: OFF');
				moveBtn.removeClass('active');
				new Notice('Pan mode enabled - drag to move canvas');
			} else {
				new Notice('Pan mode disabled');
			}
			this.updateCursor();
		});

		// Select/Move mode toggle
		const moveBtn = toolbar.createEl('button', {
			text: 'Select/Move: OFF',
			cls: 'move-btn'
		});
		moveBtn.addEventListener('click', () => {
			this.moveMode = !this.moveMode;
			moveBtn.setText(`Select/Move: ${this.moveMode ? 'ON' : 'OFF'}`);
			moveBtn.toggleClass('active', this.moveMode);
			if (this.moveMode) {
				// Disable handwriting, eraser, and pan modes when move is enabled
				this.drawingMode = false;
				this.eraserMode = false;
				this.panMode = false;
				drawingBtn.setText('Handwriting: OFF');
				drawingBtn.removeClass('active');
				eraserBtn.setText('Eraser: OFF');
				eraserBtn.removeClass('active');
				panBtn.setText('Pan: OFF');
				panBtn.removeClass('active');
				new Notice('Select/Move mode enabled - click to select, drag to move');
			} else {
				new Notice('Select/Move mode disabled');
				this.selectedTextIndex = -1;
				this.selectedStrokeIndex = -1;
				this.isPartialSelection = false;
				this.partialSelectionChars = [];
			}
			this.updateCursor();
		});

		// Zoom controls
		const zoomOutBtn = toolbar.createEl('button', { text: 'Zoom Out (-)' });
		zoomOutBtn.addEventListener('click', () => {
			this.zoomOut();
		});

		const zoomResetBtn = toolbar.createEl('button', { text: 'Zoom 100%' });
		zoomResetBtn.addEventListener('click', () => {
			this.resetZoom();
		});

		const zoomInBtn = toolbar.createEl('button', { text: 'Zoom In (+)' });
		zoomInBtn.addEventListener('click', () => {
			this.zoomIn();
		});

		// Undo button
		const undoBtn = toolbar.createEl('button', { text: 'Undo (Ctrl+Z)' });
		undoBtn.addEventListener('click', () => {
			this.undo();
		});

		// Redo button
		const redoBtn = toolbar.createEl('button', { text: 'Redo (Ctrl+Y)' });
		redoBtn.addEventListener('click', () => {
			this.redo();
		});

		// Save canvas button
		const saveBtn = toolbar.createEl('button', { text: 'Save Canvas' });
		saveBtn.addEventListener('click', () => {
			new SaveCanvasModal(this.app, this).open();
		});

		// Load canvas button
		const loadBtn = toolbar.createEl('button', { text: 'Load Canvas' });
		loadBtn.addEventListener('click', () => {
			new LoadCanvasModal(this.app, this).open();
		});

		// Clear button
		const clearBtn = toolbar.createEl('button', { text: 'Clear Canvas' });
		clearBtn.addEventListener('click', () => {
			this.clearCanvas();
		});

		// Extract text button
		const extractBtn = toolbar.createEl('button', {
			text: 'Extract Text (OCR)',
			cls: 'extract-btn'
		});
		extractBtn.addEventListener('click', () => {
			this.extractText();
		});

		// Canvas (two layers: lines in back, content in front)
		const canvasWrapper = container.createDiv({ cls: 'canvas-wrapper' });

		// Background canvas for lines
		this.linesCanvas = canvasWrapper.createEl('canvas', { cls: 'lines-canvas' });
		this.linesCtx = this.linesCanvas.getContext('2d');

		// Main canvas for drawing content
		this.canvas = canvasWrapper.createEl('canvas', { cls: 'content-canvas' });
		this.ctx = this.canvas.getContext('2d');

		// Set canvas size
		this.resizeCanvas();

		// Observe wrapper resize
		const resizeObserver = new ResizeObserver(() => {
			this.resizeCanvas();
		});
		resizeObserver.observe(canvasWrapper);

		// Store observer for cleanup
		this.resizeObserver = resizeObserver;

		// Drawing events
		this.canvas.addEventListener('pointerdown', (e) => {
			// Don't prevent default for middle mouse (always allow pan) or right-click (context menu)
			const isMiddleClick = e.button === 1;
			const isRightClick = e.button === 2;

			if (!isMiddleClick && !isRightClick) {
				// Prevent default for stylus top button (eraser/zoom)
				const topButtonPressed = e.pointerType === 'pen' && ((e.buttons & 4) !== 0);
				if (topButtonPressed) {
					e.preventDefault();
				}
			}

			this.startDrawing(e);
		});
		this.canvas.addEventListener('pointermove', (e) => {
			// Update cursor based on mode and hover position
			if (this.moveMode && !this.isDraggingObject) {
				this.updateCursor(e.offsetX, e.offsetY);
			} else if (!this.isDrawing) {
				// Update cursor when hovering (not drawing)
				this.updateCursor();
			}
			this.draw(e);
		});
		this.canvas.addEventListener('pointerup', () => this.stopDrawing());
		this.canvas.addEventListener('pointerout', () => this.stopDrawing());

		// Handle pointerenter to set cursor when stylus hovers over canvas
		this.canvas.addEventListener('pointerenter', (e) => {
			this.updateCursor();
		});

		// Enable pen pressure
		this.canvas.style.touchAction = 'none';

		// Keyboard shortcuts
		this.registerKeyboardShortcuts(container);

		// Load saved canvas data
		await this.loadCanvasData();

		// Save initial state
		this.saveState();
	}

	resizeCanvas() {
		const wrapper = this.canvas.parentElement;
		const rect = wrapper.getBoundingClientRect();

		// Save current drawing content
		const imageData = this.ctx ? this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height) : null;

		// Use a large virtual canvas size for infinite-like canvas experience
		// Users can pan and zoom to access the full space
		const width = 5000;
		const height = 5000;

		this.canvas.width = width;
		this.canvas.height = height;
		this.linesCanvas.width = width;
		this.linesCanvas.height = height;

		// Restore drawing content
		if (imageData) {
			this.ctx.putImageData(imageData, 0, 0);
		}

		this.ctx.lineCap = 'round';
		this.ctx.lineJoin = 'round';

		// Redraw lines on the lines canvas
		this.drawRuledLines();

		// Set initial cursor
		this.updateCursor();
	}

	updateCursor(x, y) {
		// Update cursor based on current mode
		if (this.panMode) {
			this.canvas.style.cursor = 'grab';
		} else if (this.moveMode) {
			// In move mode, show different cursors based on context
			if (x !== undefined && y !== undefined) {
				const textIndex = this.getTextObjectAtPosition(x, y);
				if (textIndex >= 0) {
					// Hovering over text - show pointer for selection
					if (this.selectedTextIndex === textIndex) {
						// Already selected - show move cursor
						this.canvas.style.cursor = 'move';
					} else {
						// Not selected - show pointer for selection
						this.canvas.style.cursor = 'pointer';
					}
				} else {
					// Not hovering over anything
					this.canvas.style.cursor = 'default';
				}
			} else {
				this.canvas.style.cursor = 'default';
			}
		} else if (this.eraserMode) {
			// Custom eraser cursor - create a small square cursor
			const size = Math.max(8, Math.min(32, this.baseLineWidth * 2));
			const canvas = document.createElement('canvas');
			canvas.width = size;
			canvas.height = size;
			const ctx = canvas.getContext('2d');

			// Use white for dark mode, black for light mode
			const isDark = this.getEffectiveDarkMode();
			ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
			ctx.lineWidth = 2;
			ctx.strokeRect(1, 1, size - 2, size - 2);
			const url = canvas.toDataURL();
			this.canvas.style.cursor = `url('${url}') ${size/2} ${size/2}, auto`;
		} else {
			// Default drawing cursor
			this.canvas.style.cursor = 'crosshair';
		}
	}

	drawRuledLines() {
		if (!this.linesCtx) return;

		// Clear lines canvas first
		this.linesCtx.clearRect(0, 0, this.linesCanvas.width, this.linesCanvas.height);

		// Only draw if lines are enabled
		if (!this.showLines) return;

		const isDark = this.getEffectiveDarkMode();
		const lineColor = isDark ? 'rgba(100, 100, 100, 0.4)' : 'rgba(200, 200, 200, 0.6)';

		// Draw lines directly on the lines canvas
		this.linesCtx.strokeStyle = lineColor;
		this.linesCtx.lineWidth = 1;

		const totalLineHeight = this.lineHeight + this.lineGap;
		for (let y = this.lineGap; y < this.linesCanvas.height; y += totalLineHeight) {
			this.linesCtx.beginPath();
			this.linesCtx.moveTo(0, y);
			this.linesCtx.lineTo(this.linesCanvas.width, y);
			this.linesCtx.stroke();
		}
	}

	startDrawing(e) {
		// Check which buttons are pressed (stylus or mouse)
		const topButtonPressed = e.pointerType === 'pen' && ((e.buttons & 4) !== 0); // Stylus top button
		const bottomButtonPressed = e.pointerType === 'pen' && ((e.buttons & 2) !== 0); // Stylus bottom button
		const middleMouseButton = e.button === 1; // Middle mouse click
		const rightMouseButton = e.button === 2; // Right mouse click

		// Middle mouse button always pans, regardless of mode
		if (middleMouseButton || (e.buttons & 4 && e.pointerType === 'mouse')) {
			this.isPanning = true;
			this.lastX = e.offsetX;
			this.lastY = e.offsetY;
			this.canvas.style.cursor = 'grab';
			return;
		}

		// Right-click or stylus bottom button shows context menu (unless in specific modes)
		const shouldShowContextMenu = rightMouseButton || bottomButtonPressed;

		// Move mode behavior:
		// - NO button = select whole text box / move if already selected
		// - Top button = select individual characters (partial selection)
		// - Bottom button = show context menu

		if (this.moveMode) {
			if (shouldShowContextMenu) {
				// Show context menu
				this.showContextMenu(e.offsetX, e.offsetY, e.clientX, e.clientY);
				return;
			} else if (topButtonPressed) {
				// Partial selection mode - select individual characters
				const textIndex = this.getTextObjectAtPosition(e.offsetX, e.offsetY);
				if (textIndex >= 0) {
					this.selectedTextIndex = textIndex;
					this.isPartialSelection = true;
					// TODO: Implement character-level selection UI
					new Notice('Partial selection - select characters to separate');
					this.redrawWithSelection();
				}
				return;
			} else {
				// Normal press - select whole text/stroke or start moving
				const textIndex = this.getTextObjectAtPosition(e.offsetX, e.offsetY);
				const strokeIndex = this.getStrokeAtPosition(e.offsetX, e.offsetY);

				if (textIndex >= 0) {
					if (this.selectedTextIndex === textIndex && !this.isPartialSelection && this.selectedStrokeIndex === -1) {
						// Already selected - start moving
						this.isDraggingObject = true;
						this.dragStartX = e.offsetX;
						this.dragStartY = e.offsetY;
					} else {
						// New selection - select whole text
						this.selectedTextIndex = textIndex;
						this.selectedStrokeIndex = -1;
						this.isPartialSelection = false;
						this.partialSelectionChars = [];
						this.redrawWithSelection();
					}
				} else if (strokeIndex >= 0) {
					if (this.selectedStrokeIndex === strokeIndex && this.selectedTextIndex === -1) {
						// Already selected - start moving
						this.isDraggingObject = true;
						this.dragStartX = e.offsetX;
						this.dragStartY = e.offsetY;
					} else {
						// New selection - select stroke
						this.selectedTextIndex = -1;
						this.selectedStrokeIndex = strokeIndex;
						this.isPartialSelection = false;
						this.partialSelectionChars = [];
						this.redrawWithSelection();
					}
				} else {
					// Check if clicking on one of the multi-selected objects
					let clickedOnSelected = false;

					// Check if clicking on a multi-selected text
					for (let idx of this.selectedTextIndices) {
						if (this.getTextObjectAtPosition(e.offsetX, e.offsetY) === idx) {
							clickedOnSelected = true;
							break;
						}
					}

					// Check if clicking on a multi-selected stroke
					if (!clickedOnSelected) {
						for (let idx of this.selectedStrokeIndices) {
							if (this.getStrokeAtPosition(e.offsetX, e.offsetY) === idx) {
								clickedOnSelected = true;
								break;
							}
						}
					}

					if (clickedOnSelected) {
						// Clicking on one of the selected objects - start dragging all
						this.isDraggingObject = true;
						this.dragStartX = e.offsetX;
						this.dragStartY = e.offsetY;
					} else {
						// Clicking on empty space - start drag selection
						this.isDraggingSelection = true;
						this.dragSelectionStart = { x: e.offsetX, y: e.offsetY };
						this.dragSelectionEnd = { x: e.offsetX, y: e.offsetY };
						// Clear all selections
						this.selectedTextIndex = -1;
						this.selectedStrokeIndex = -1;
						this.selectedTextIndices = [];
						this.selectedStrokeIndices = [];
						this.isPartialSelection = false;
						this.partialSelectionChars = [];
					}
				}
				return;
			}
		}

		// Pan mode behavior:
		// - Pan mode ON + NO button = pan
		// - Pan mode ON + top button (4) = zoom out
		// - Pan mode ON + bottom button (2) = zoom in
		// - Pan mode OFF + top button = erase

		if (this.panMode) {
			if (topButtonPressed) {
				this.zoomOut();
				return;
			} else if (bottomButtonPressed) {
				this.zoomIn();
				return;
			} else {
				// No buttons pressed - start panning
				this.isPanning = true;
				this.lastX = e.offsetX;
				this.lastY = e.offsetY;
				return;
			}
		}

		// Right-click / stylus bottom button always shows context menu (unless panning)
		if (shouldShowContextMenu && !this.panMode) {
			this.showContextMenu(e.offsetX, e.offsetY, e.clientX, e.clientY);
			return;
		}

		// Don't start drawing/erasing if not in drawing or eraser mode
		if (!this.drawingMode && !this.eraserMode) {
			return;
		}

		// Check if erasing (stylus top button, flipped stylus, or eraser toggle)
		this.currentlyErasing = this.eraserMode ||
			e.pointerType === 'eraser' ||
			topButtonPressed; // Top button erases when not in pan mode

		// Don't start drawing if right-clicking or using stylus bottom button
		if (shouldShowContextMenu) {
			return;
		}

		this.isDrawing = true;
		this.lastX = e.offsetX;
		this.lastY = e.offsetY;
		this.lastTime = Date.now();

		// Reset path optimization flags for new stroke
		this._strokeStarted = false; // Flag to track if we've started THIS stroke
		this._lastLineWidth = undefined;
		this._lastOpacity = undefined;
		this._wasErasing = false;

		// Only initialize stroke if not erasing
		if (!this.currentlyErasing) {
			this.currentStroke = [{ x: this.lastX, y: this.lastY, pressure: e.pressure || 0.5 }];
		} else {
			this.currentStroke = []; // Empty stroke when erasing
		}
	}

	draw(e) {
		const x = e.offsetX;
		const y = e.offsetY;

		// Handle drag selection in move mode
		if (this.isDraggingSelection) {
			this.dragSelectionEnd = { x, y };
			// Throttle redraws
			if (!this.redrawScheduled) {
				this.redrawScheduled = true;
				requestAnimationFrame(() => {
					this.redrawWithSelection();
					this.redrawScheduled = false;
				});
			}
			return;
		}

		// Handle object dragging in move mode
		if (this.isDraggingObject) {
			const dx = x - this.dragStartX;
			const dy = y - this.dragStartY;

			if (this.selectedTextIndex >= 0) {
				// Move text object
				const textObj = this.textObjects[this.selectedTextIndex];
				textObj.x += dx;
				textObj.y += dy;
			} else if (this.selectedStrokeIndex >= 0) {
				// Move stroke
				const stroke = this.strokes[this.selectedStrokeIndex];
				const points = this.getStrokePoints(stroke);
				for (let point of points) {
					point.x += dx;
					point.y += dy;
				}
			} else if (this.selectedTextIndices.length > 0 || this.selectedStrokeIndices.length > 0) {
				// Move multiple selected objects
				for (let idx of this.selectedTextIndices) {
					const textObj = this.textObjects[idx];
					textObj.x += dx;
					textObj.y += dy;
				}
				for (let idx of this.selectedStrokeIndices) {
					const stroke = this.strokes[idx];
					const points = this.getStrokePoints(stroke);
					for (let point of points) {
						point.x += dx;
						point.y += dy;
					}
				}
			}

			this.dragStartX = x;
			this.dragStartY = y;

			// Throttle redraws using requestAnimationFrame
			if (!this.redrawScheduled) {
				this.redrawScheduled = true;
				requestAnimationFrame(() => {
					this.redrawWithSelection();
					this.redrawScheduled = false;
				});
			}
			return;
		}

		// Handle panning
		if (this.isPanning) {
			const dx = x - this.lastX;
			const dy = y - this.lastY;
			this.panOffsetX += dx / this.zoomLevel;
			this.panOffsetY += dy / this.zoomLevel;
			this.applyZoom();
			this.lastX = x;
			this.lastY = y;
			return;
		}

		if (!this.isDrawing) return;

		// Calculate distance
		const dx = x - this.lastX;
		const dy = y - this.lastY;
		const distanceSq = dx * dx + dy * dy;

		// Check if currently erasing
		const topButtonPressed = e.pointerType === 'pen' && ((e.buttons & 4) !== 0);
		const isErasing = this.eraserMode ||
			e.pointerType === 'eraser' ||
			(!this.panMode && topButtonPressed);

		// Skip point sampling for eraser (needs every point to avoid gaps)
		// For drawing, skip if pointer hasn't moved at least 1.5 pixels (reduces draw calls)
		if (!isErasing && distanceSq < 2.25) return; // 1.5 * 1.5 = 2.25

		const distance = Math.sqrt(distanceSq);

		const pressure = e.pressure || 0.5;
		const currentTime = Date.now();

		if (isErasing) {
			// Erase mode
			this.drawEraser(x, y, pressure);
		} else {
			// Calculate stroke direction and properties
			const dt = currentTime - this.lastTime || 1;
			const velocity = distance / dt;

			// Calculate stroke angle (in radians)
			const strokeAngle = Math.atan2(dy, dx);

			// Draw based on pen type
			switch (this.penType) {
				case 'calligraphy':
					this.drawCalligraphy(x, y, pressure, strokeAngle);
					break;
				case 'fountain':
					this.drawFountainPen(x, y, pressure, velocity);
					break;
				case 'pencil':
					this.drawPencil(x, y, pressure, velocity);
					break;
				case 'regular':
				default:
					this.drawRegularPen(x, y, pressure);
					break;
			}
		}

		// Save stroke data ONLY if not erasing
		if (!isErasing) {
			this.currentStroke.push({ x, y, pressure });
		}

		this.lastX = x;
		this.lastY = y;
		this.lastTime = currentTime;
	}

	drawRegularPen(x, y, pressure) {
		// Simple pressure-responsive pen with smooth curves
		const lineWidth = this.baseLineWidth * (0.5 + pressure);

		// Set stroke properties once per stroke (not per point)
		if (!this._strokeStarted) {
			this.ctx.strokeStyle = this.penColor;
			this.ctx.lineCap = 'round';
			this.ctx.lineJoin = 'round';
			this.ctx.lineWidth = lineWidth;
			this._strokeStarted = true;
			this._lastLineWidth = lineWidth;
			this._prevX = this.lastX;
			this._prevY = this.lastY;

			// Start path
			this.ctx.beginPath();
			this.ctx.moveTo(this.lastX, this.lastY);
		}

		// Update line width only if it changed significantly (>10% change)
		const widthDiff = Math.abs(lineWidth - this._lastLineWidth);
		if (widthDiff > this._lastLineWidth * 0.1) {
			this.ctx.lineWidth = lineWidth;
			this._lastLineWidth = lineWidth;
		}

		// Use quadratic curves for smooth drawing
		// Control point is the previous point, curve to midpoint
		const midX = (this._prevX + x) / 2;
		const midY = (this._prevY + y) / 2;
		this.ctx.quadraticCurveTo(this._prevX, this._prevY, midX, midY);
		this.ctx.stroke();

		// Update previous point
		this._prevX = x;
		this._prevY = y;
	}

	drawCalligraphy(x, y, pressure, strokeAngle) {
		// Calligraphy pen with FIXED rectangular nib and SMOOTH CURVES
		// Fixed nib angle - does NOT rotate with stroke direction
		// Uses smooth stroke rendering instead of sharp quadrilaterals

		// Cache perpendicular angle calculations if not already cached
		if (!this._calligraphyCosPerp || this._lastCalligraphyAngle !== this.calligraphyAngle) {
			const nibAngleFixed = (this.calligraphyAngle * Math.PI) / 180;
			const perpAngle = nibAngleFixed + (Math.PI / 2);
			this._calligraphyCosPerp = Math.cos(perpAngle);
			this._calligraphySinPerp = Math.sin(perpAngle);
			this._lastCalligraphyAngle = this.calligraphyAngle;
		}

		// Nib width adjusted by pressure
		const nibWidth = this.baseLineWidth * 3 * (0.7 + pressure * 0.3);

		// Calculate line width based on stroke angle relative to nib angle
		// This creates the characteristic thick/thin variation of calligraphy
		const nibAngleRad = (this.calligraphyAngle * Math.PI) / 180;
		const angleDiff = Math.abs(strokeAngle - nibAngleRad);
		const widthFactor = Math.abs(Math.sin(angleDiff));
		const lineWidth = nibWidth * (0.3 + widthFactor * 0.7);

		// Set stroke properties once per stroke (not per point)
		if (!this._strokeStarted) {
			this.ctx.strokeStyle = this.penColor;
			this.ctx.lineCap = 'round';
			this.ctx.lineJoin = 'round';
			this.ctx.lineWidth = lineWidth;
			this._strokeStarted = true;
			this._lastLineWidth = lineWidth;
			this._prevX = this.lastX;
			this._prevY = this.lastY;

			// Start path
			this.ctx.beginPath();
			this.ctx.moveTo(this.lastX, this.lastY);
		}

		// Update line width only if it changed significantly (>10% change)
		const widthDiff = Math.abs(lineWidth - this._lastLineWidth);
		if (widthDiff > this._lastLineWidth * 0.1) {
			this.ctx.lineWidth = lineWidth;
			this._lastLineWidth = lineWidth;
		}

		// Use quadratic curves for smooth drawing
		const midX = (this._prevX + x) / 2;
		const midY = (this._prevY + y) / 2;
		this.ctx.quadraticCurveTo(this._prevX, this._prevY, midX, midY);
		this.ctx.stroke();

		// Update previous point
		this._prevX = x;
		this._prevY = y;
	}

	drawFountainPen(x, y, pressure, velocity) {
		// Fountain pen: smooth ink flow with smooth curves
		const baseWidth = this.baseLineWidth * (0.6 + pressure * 0.4);
		const velocityFactor = Math.max(0.8, 1.2 - velocity * 0.3);
		const lineWidth = baseWidth * velocityFactor;

		// Set stroke properties once per stroke (not per point)
		if (!this._strokeStarted) {
			this.ctx.strokeStyle = this.penColor;
			this.ctx.lineCap = 'round';
			this.ctx.lineJoin = 'round';
			this.ctx.lineWidth = lineWidth;
			this._strokeStarted = true;
			this._lastLineWidth = lineWidth;
			this._prevX = this.lastX;
			this._prevY = this.lastY;

			// Start path
			this.ctx.beginPath();
			this.ctx.moveTo(this.lastX, this.lastY);
		}

		// Update line width only if it changed significantly (>10% change)
		const widthDiff = Math.abs(lineWidth - this._lastLineWidth);
		if (widthDiff > this._lastLineWidth * 0.1) {
			this.ctx.lineWidth = lineWidth;
			this._lastLineWidth = lineWidth;
		}

		// Use quadratic curves for smooth drawing
		const midX = (this._prevX + x) / 2;
		const midY = (this._prevY + y) / 2;
		this.ctx.quadraticCurveTo(this._prevX, this._prevY, midX, midY);
		this.ctx.stroke();

		// Update previous point
		this._prevX = x;
		this._prevY = y;
	}

	drawPencil(x, y, pressure, velocity) {
		// Pencil: simple stroke with variable opacity and smooth curves
		const baseWidth = this.baseLineWidth * (0.4 + pressure * 0.6);
		const opacity = 0.6 + pressure * 0.3;

		// Set stroke properties once per stroke (not per point)
		if (!this._strokeStarted) {
			this.ctx.strokeStyle = this.penColor;
			this.ctx.lineCap = 'round';
			this.ctx.lineJoin = 'round';
			this.ctx.globalAlpha = opacity;
			this.ctx.lineWidth = baseWidth;
			this._strokeStarted = true;
			this._lastOpacity = opacity;
			this._lastLineWidth = baseWidth;
			this._prevX = this.lastX;
			this._prevY = this.lastY;

			// Start path
			this.ctx.beginPath();
			this.ctx.moveTo(this.lastX, this.lastY);
		}

		// Update opacity/width only if they changed significantly (>10% change)
		const opacityDiff = Math.abs(opacity - this._lastOpacity);
		const widthDiff = Math.abs(baseWidth - this._lastLineWidth);

		if (opacityDiff > 0.1) {
			this.ctx.globalAlpha = opacity;
			this._lastOpacity = opacity;
		}
		if (widthDiff > this._lastLineWidth * 0.1) {
			this.ctx.lineWidth = baseWidth;
			this._lastLineWidth = baseWidth;
		}

		// Use quadratic curves for smooth drawing
		const midX = (this._prevX + x) / 2;
		const midY = (this._prevY + y) / 2;
		this.ctx.quadraticCurveTo(this._prevX, this._prevY, midX, midY);
		this.ctx.stroke();

		// Update previous point
		this._prevX = x;
		this._prevY = y;
	}

	drawEraser(x, y, pressure) {
		// Eraser - removes content using destination-out - OPTIMIZED
		const eraserSize = this.baseLineWidth * (0.5 + pressure) * 1.5;

		// Set composite operation once per stroke (not per point)
		if (!this._strokeStarted) {
			this.ctx.globalCompositeOperation = 'destination-out';
			this._strokeStarted = true;
			this._wasErasing = true;
		}

		// Draw eraser circle (beginPath for each circle to avoid artifacts)
		this.ctx.beginPath();
		this.ctx.arc(x, y, eraserSize, 0, Math.PI * 2);
		this.ctx.fill();
	}

	stopDrawing() {
		if (this.isDraggingSelection) {
			// Complete drag selection - find all objects in rectangle
			const rect = this.getSelectionRect();
			this.selectedTextIndices = [];
			this.selectedStrokeIndices = [];

			// Find text objects in rectangle
			for (let i = 0; i < this.textObjects.length; i++) {
				if (this.isTextInRect(i, rect)) {
					this.selectedTextIndices.push(i);
				}
			}

			// Find strokes in rectangle
			for (let i = 0; i < this.strokes.length; i++) {
				if (this.isStrokeInRect(i, rect)) {
					this.selectedStrokeIndices.push(i);
				}
			}

			this.isDraggingSelection = false;
			this.redrawWithSelection();

			const totalSelected = this.selectedTextIndices.length + this.selectedStrokeIndices.length;
			if (totalSelected > 0) {
				new Notice(`Selected ${totalSelected} object(s)`);
			}
			return;
		}

		if (this.isDraggingObject) {
			// Save state after moving object
			this.saveState();
			this.isDraggingObject = false;
		}

		if (this.isDrawing && this.currentStroke.length > 0) {
			// Flush any remaining batched points before saving
			if (this._batchPointCount > 0) {
				this.ctx.stroke();
				this._batchPointCount = 0;
			}

			// Save stroke with metadata for proper duplication and rendering
			this.strokes.push({
				points: [...this.currentStroke],
				penType: this.penType,
				penColor: this.penColor,
				baseLineWidth: this.baseLineWidth
			});
			this.saveState();
		}

		// Reset canvas state after drawing/erasing
		if (this._wasErasing) {
			this.ctx.globalCompositeOperation = 'source-over';
		}
		if (this._lastOpacity !== undefined && this._lastOpacity !== 1) {
			this.ctx.globalAlpha = 1;
		}

		// Restore cursor after panning
		if (this.isPanning) {
			this.updateCursor();
		}

		this.isDrawing = false;
		this.isPanning = false;
		this.currentStroke = [];
	}

	saveState() {
		// Remove any redo states
		this.history = this.history.slice(0, this.historyStep + 1);

		// Save current canvas state WITHOUT text objects (they're saved separately)
		// First, clear canvas and redraw only strokes
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// Redraw all strokes
		for (let stroke of this.strokes) {
			const points = this.getStrokePoints(stroke);
			if (points.length > 0) {
				// If stroke has metadata, use it; otherwise use current settings
				if (!Array.isArray(stroke)) {
					this.redrawStroke(stroke);
				} else {
					// Old format - just draw with current settings
					this.ctx.strokeStyle = this.penColor;
					this.ctx.lineWidth = this.baseLineWidth;
					this.ctx.lineCap = 'round';
					this.ctx.lineJoin = 'round';
					this.ctx.beginPath();
					for (let i = 0; i < points.length; i++) {
						if (i === 0) {
							this.ctx.moveTo(points[i].x, points[i].y);
						} else {
							this.ctx.lineTo(points[i].x, points[i].y);
						}
					}
					this.ctx.stroke();
				}
			}
		}

		// Capture imageData (only strokes, no text)
		const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

		// Now re-render text objects on top
		this.renderTextObjects();

		this.history.push({
			imageData: imageData,
			strokes: JSON.parse(JSON.stringify(this.strokes)),
			textRegions: JSON.parse(JSON.stringify(this.textRegions)),
			textObjects: JSON.parse(JSON.stringify(this.textObjects))
		});

		this.historyStep++;

		// Limit history to 50 states
		if (this.history.length > 50) {
			this.history.shift();
			this.historyStep--;
		}

		// Auto-save canvas data to disk
		this.saveCanvasData();
	}

	async saveCanvasData(name = 'autosave') {
		// Save canvas data to plugin settings with a name
		if (!this.plugin.settings.savedCanvases) {
			this.plugin.settings.savedCanvases = {};
		}

		this.plugin.settings.savedCanvases[name] = {
			strokes: this.strokes,
			textObjects: this.textObjects,
			canvasMode: this.canvasMode,
			zoom: this.zoom,
			savedAt: new Date().toISOString()
		};

		await this.plugin.saveSettings();
		console.log(`Saved canvas: "${name}"`);
	}

	async loadCanvasData(name = 'autosave') {
		// Load canvas data from plugin settings by name
		if (!this.plugin.settings.savedCanvases) {
			this.plugin.settings.savedCanvases = {};
		}

		const canvasData = this.plugin.settings.savedCanvases[name];
		if (canvasData) {
			this.strokes = canvasData.strokes || [];
			this.textObjects = canvasData.textObjects || [];
			this.canvasMode = canvasData.canvasMode || 'light';
			this.zoom = canvasData.zoom || 1;

			// Redraw loaded canvas
			this.redrawCanvas();

			console.log(`Loaded canvas: "${name}" - ${this.strokes.length} strokes, ${this.textObjects.length} text objects`);
			return true;
		} else {
			console.log(`No saved canvas found with name: "${name}"`);
			return false;
		}
	}

	getSavedCanvasNames() {
		// Get list of all saved canvas names
		if (!this.plugin.settings.savedCanvases) {
			return [];
		}
		return Object.keys(this.plugin.settings.savedCanvases);
	}

	async deleteCanvasData(name) {
		// Delete a saved canvas
		if (this.plugin.settings.savedCanvases && this.plugin.settings.savedCanvases[name]) {
			delete this.plugin.settings.savedCanvases[name];
			await this.plugin.saveSettings();
			console.log(`Deleted canvas: "${name}"`);
		}
	}

	undo() {
		if (this.historyStep > 0) {
			this.historyStep--;
			this.restoreState();
			new Notice('Undo');
		}
	}

	redo() {
		if (this.historyStep < this.history.length - 1) {
			this.historyStep++;
			this.restoreState();
			new Notice('Redo');
		}
	}

	restoreState() {
		if (this.history[this.historyStep]) {
			const state = this.history[this.historyStep];

			// Clear canvas first
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

			// Restore the imageData (content without lines)
			this.ctx.putImageData(state.imageData, 0, 0);
			this.strokes = JSON.parse(JSON.stringify(state.strokes));
			this.textRegions = JSON.parse(JSON.stringify(state.textRegions));

			// Restore text objects
			this.textObjects = state.textObjects ? JSON.parse(JSON.stringify(state.textObjects)) : [];

			// Redraw text objects
			this.renderTextObjects();

			// Always redraw lines fresh with full opacity
			if (this.showLines) {
				this.drawRuledLines();
			}
		}
	}

	zoomIn() {
		this.zoomLevel = Math.min(this.zoomLevel * 1.2, 5); // Max 5x zoom
		this.applyZoom();
		new Notice(`Zoom: ${Math.round(this.zoomLevel * 100)}%`);
	}

	zoomOut() {
		this.zoomLevel = Math.max(this.zoomLevel / 1.2, 0.2); // Min 20% zoom
		this.applyZoom();
		new Notice(`Zoom: ${Math.round(this.zoomLevel * 100)}%`);
	}

	resetZoom() {
		this.zoomLevel = 1;
		this.panOffsetX = 0;
		this.panOffsetY = 0;
		this.applyZoom();
		new Notice('Zoom reset to 100%');
	}

	applyZoom() {
		// Apply CSS transform for zoom and pan
		this.canvas.style.transform = `scale(${this.zoomLevel}) translate(${this.panOffsetX}px, ${this.panOffsetY}px)`;
		this.linesCanvas.style.transform = `scale(${this.zoomLevel}) translate(${this.panOffsetX}px, ${this.panOffsetY}px)`;
	}

	registerKeyboardShortcuts(container) {
		// Add keyboard event listener
		const handleKeyboard = (e) => {
			// Ctrl+Z - Undo
			if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
				e.preventDefault();
				this.undo();
			}
			// Ctrl+Y or Ctrl+Shift+Z - Redo
			else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
				e.preventDefault();
				this.redo();
			}
			// Ctrl+C - Copy selected text from note
			else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
				e.preventDefault();
				this.copyTextFromNote();
			}
			// Ctrl+X - Cut selected text from note and paste onto canvas
			else if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
				e.preventDefault();
				this.cutTextFromNote();
			}
			// Ctrl+V - Paste text onto canvas
			else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
				e.preventDefault();
				this.pasteText();
			}
		};

		container.addEventListener('keydown', handleKeyboard);

		// Add right-click context menu
		this.canvas.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			// Store canvas coordinates for pasting at cursor
			this.contextMenuX = e.offsetX;
			this.contextMenuY = e.offsetY;
			// Show context menu at click position
			this.showContextMenu(e.offsetX, e.offsetY, e.clientX, e.clientY);
		});

		// Make container focusable so it can receive keyboard events
		container.setAttribute('tabindex', '0');
		container.focus();
	}

	async copyCanvas() {
		try {
			this.canvas.toBlob(async (blob) => {
				await navigator.clipboard.write([
					new ClipboardItem({ 'image/png': blob })
				]);
				new Notice('Canvas copied to clipboard');
			});
		} catch (error) {
			console.error('Copy failed:', error);
			new Notice('Failed to copy canvas');
		}
	}

	async pasteText() {
		try {
			const text = await navigator.clipboard.readText();
			if (text) {
				// Create a text object at cursor position
				const textObj = {
					text: text,
					x: this.contextMenuX,
					y: this.contextMenuY,
					fontSize: this.fontSize,
					color: this.isDarkMode ? '#cccccc' : '#555555'
				};
				this.textObjects.push(textObj);
				this.renderTextObjects();
				this.saveState(); // Save state so text persists
				new Notice('Text pasted onto canvas');
			}
		} catch (error) {
			console.error('Paste failed:', error);
			new Notice('No text found in clipboard');
		}
	}

	renderTextObjects() {
		// Redraw all text objects
		for (let textObj of this.textObjects) {
			this.ctx.save();
			this.ctx.fillStyle = textObj.color;
			this.ctx.font = `${textObj.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
			this.ctx.fillText(textObj.text, textObj.x, textObj.y);
			this.ctx.restore();
		}
	}

	getTextObjectAtPosition(x, y) {
		// Find if clicking on a text object (check in reverse order for top-most)
		for (let i = this.textObjects.length - 1; i >= 0; i--) {
			const textObj = this.textObjects[i];
			this.ctx.font = `${textObj.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
			const metrics = this.ctx.measureText(textObj.text);
			const width = metrics.width;
			const height = textObj.fontSize;

			// Check if click is within text bounds
			if (x >= textObj.x && x <= textObj.x + width &&
				y >= textObj.y - height && y <= textObj.y) {
				return i;
			}
		}
		return -1;
	}

	getStrokePoints(stroke) {
		// Helper to get points array from stroke (handles both old and new format)
		return Array.isArray(stroke) ? stroke : stroke.points;
	}

	getSelectionRect() {
		// Get normalized selection rectangle
		const x1 = Math.min(this.dragSelectionStart.x, this.dragSelectionEnd.x);
		const y1 = Math.min(this.dragSelectionStart.y, this.dragSelectionEnd.y);
		const x2 = Math.max(this.dragSelectionStart.x, this.dragSelectionEnd.x);
		const y2 = Math.max(this.dragSelectionStart.y, this.dragSelectionEnd.y);
		return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
	}

	hexToRgb(hex) {
		// Convert hex color to RGB object
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : { r: 0, g: 170, b: 255 }; // Default to blue if parsing fails
	}

	isTextInRect(textIndex, rect) {
		// Check if text object overlaps with selection rectangle
		if (textIndex < 0 || textIndex >= this.textObjects.length) return false;

		const textObj = this.textObjects[textIndex];
		this.ctx.font = `${textObj.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
		const metrics = this.ctx.measureText(textObj.text);
		const width = metrics.width;
		const height = textObj.fontSize;

		const textX1 = textObj.x;
		const textY1 = textObj.y - height;
		const textX2 = textObj.x + width;
		const textY2 = textObj.y;

		// Check if rectangles overlap
		return !(rect.x + rect.width < textX1 ||
		         rect.x > textX2 ||
		         rect.y + rect.height < textY1 ||
		         rect.y > textY2);
	}

	isStrokeInRect(strokeIndex, rect) {
		// Check if stroke overlaps with selection rectangle
		if (strokeIndex < 0 || strokeIndex >= this.strokes.length) return false;

		const stroke = this.strokes[strokeIndex];
		const points = this.getStrokePoints(stroke);

		// Check if any point of the stroke is within the rectangle
		for (let point of points) {
			if (point.x >= rect.x && point.x <= rect.x + rect.width &&
			    point.y >= rect.y && point.y <= rect.y + rect.height) {
				return true;
			}
		}
		return false;
	}

	redrawStroke(stroke) {
		// Redraw a stroke using its metadata
		const points = this.getStrokePoints(stroke);
		if (points.length === 0) return;

		// Get stroke metadata (use current settings for old format)
		const penType = Array.isArray(stroke) ? 'regular' : stroke.penType;
		const penColor = Array.isArray(stroke) ? this.penColor : stroke.penColor;
		const baseLineWidth = Array.isArray(stroke) ? this.baseLineWidth : stroke.baseLineWidth;

		// Save current drawing state
		const savedPenType = this.penType;
		const savedPenColor = this.penColor;
		const savedBaseLineWidth = this.baseLineWidth;

		// Apply stroke's settings
		this.penType = penType;
		this.penColor = penColor;
		this.baseLineWidth = baseLineWidth;

		// CRITICAL: Reset optimization flags so stroke properties are set correctly
		this._strokeStarted = false;
		this._lastLineWidth = undefined;
		this._lastOpacity = undefined;

		// Draw the stroke
		for (let i = 1; i < points.length; i++) {
			const prevPoint = points[i - 1];
			const currPoint = points[i];

			this.lastX = prevPoint.x;
			this.lastY = prevPoint.y;
			this.lastTime = 0;

			const dx = currPoint.x - prevPoint.x;
			const dy = currPoint.y - prevPoint.y;
			const strokeAngle = Math.atan2(dy, dx);
			const distance = Math.sqrt(dx * dx + dy * dy);
			const velocity = distance;

			// Draw based on pen type
			switch (penType) {
				case 'calligraphy':
					this.drawCalligraphy(currPoint.x, currPoint.y, currPoint.pressure, strokeAngle);
					break;
				case 'fountain':
					this.drawFountainPen(currPoint.x, currPoint.y, currPoint.pressure, velocity);
					break;
				case 'pencil':
					this.drawPencil(currPoint.x, currPoint.y, currPoint.pressure, velocity);
					break;
				case 'regular':
				default:
					this.drawRegularPen(currPoint.x, currPoint.y, currPoint.pressure);
					break;
			}
		}

		// Restore original settings
		this.penType = savedPenType;
		this.penColor = savedPenColor;
		this.baseLineWidth = savedBaseLineWidth;
	}

	getStrokeAtPosition(x, y, tolerance = 20) {
		// Find if clicking near a stroke (check in reverse order for most recent)
		// Increased tolerance to 20px for easier selection
		for (let i = this.strokes.length - 1; i >= 0; i--) {
			const stroke = this.strokes[i];
			const points = this.getStrokePoints(stroke);

			// Check if any point in the stroke is near the click
			for (let point of points) {
				const dx = point.x - x;
				const dy = point.y - y;
				const distSq = dx * dx + dy * dy; // Use squared distance to avoid sqrt
				const toleranceSq = tolerance * tolerance;

				if (distSq <= toleranceSq) {
					return i;
				}
			}
		}
		return -1;
	}

	getStrokeBounds(strokeIndex) {
		// Calculate bounding box for a stroke
		if (strokeIndex < 0 || strokeIndex >= this.strokes.length) {
			return null;
		}

		const stroke = this.strokes[strokeIndex];
		const points = this.getStrokePoints(stroke);
		if (points.length === 0) return null;

		let minX = points[0].x;
		let maxX = points[0].x;
		let minY = points[0].y;
		let maxY = points[0].y;

		for (let point of points) {
			minX = Math.min(minX, point.x);
			maxX = Math.max(maxX, point.x);
			minY = Math.min(minY, point.y);
			maxY = Math.max(maxY, point.y);
		}

		// Add padding
		const padding = this.baseLineWidth * 2;
		return {
			x: minX - padding,
			y: minY - padding,
			width: maxX - minX + padding * 2,
			height: maxY - minY + padding * 2
		};
	}

	async copyTextFromNote() {
		try {
			const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
			if (!activeView) {
				new Notice('No active note found');
				return;
			}

			const editor = activeView.editor;
			const selection = editor.getSelection();

			if (selection) {
				await navigator.clipboard.writeText(selection);
				new Notice('Text copied to clipboard');
			} else {
				new Notice('No text selected');
			}
		} catch (error) {
			console.error('Copy text failed:', error);
			new Notice('Failed to copy text');
		}
	}

	async cutTextFromNote() {
		try {
			const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
			if (!activeView) {
				new Notice('No active note found');
				return;
			}

			const editor = activeView.editor;
			const selection = editor.getSelection();

			if (selection) {
				// Copy to clipboard
				await navigator.clipboard.writeText(selection);

				// Paste onto canvas
				this.loadTextForEditing(selection, {
					from: editor.getCursor('from'),
					to: editor.getCursor('to')
				});

				new Notice('Text cut and loaded onto canvas for editing');
			} else {
				new Notice('No text selected');
			}
		} catch (error) {
			console.error('Cut text failed:', error);
			new Notice('Failed to cut text');
		}
	}

	editTextObject(index) {
		if (index < 0 || index >= this.textObjects.length) return;

		const textObj = this.textObjects[index];
		const newText = prompt('Edit text:', textObj.text);

		if (newText !== null) {
			textObj.text = newText;
			// Clear and redraw everything
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			// Redraw strokes if any
			// (Note: strokes are already baked into the canvas from previous draws)
			// Just restore current state then render text objects
			const currentState = this.history[this.historyStep];
			if (currentState) {
				this.ctx.putImageData(currentState.imageData, 0, 0);
			}
			this.renderTextObjects();
			this.saveState();
			new Notice('Text updated');
		}
	}

	deleteTextObject(index) {
		if (index < 0 || index >= this.textObjects.length) return;

		this.textObjects.splice(index, 1);
		// Clear and redraw everything
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		const currentState = this.history[this.historyStep];
		if (currentState) {
			this.ctx.putImageData(currentState.imageData, 0, 0);
		}
		this.renderTextObjects();
		this.saveState();
		new Notice('Text deleted');
	}

	async copyTextObject(index) {
		if (index < 0 || index >= this.textObjects.length) return;

		try {
			const textObj = this.textObjects[index];
			await navigator.clipboard.writeText(textObj.text);
			new Notice('Text copied to clipboard');
		} catch (error) {
			console.error('Copy failed:', error);
			new Notice('Failed to copy text');
		}
	}

	redrawWithSelection() {
		// Clear and redraw canvas with selection highlight
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// Restore base image data
		const currentState = this.history[this.historyStep];
		if (currentState) {
			this.ctx.putImageData(currentState.imageData, 0, 0);
		}

		// Render text objects
		this.renderTextObjects();

		// Draw selection highlight for text
		if (this.selectedTextIndex >= 0 && this.selectedTextIndex < this.textObjects.length) {
			const textObj = this.textObjects[this.selectedTextIndex];
			this.ctx.save();
			this.ctx.font = `${textObj.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
			const metrics = this.ctx.measureText(textObj.text);
			const width = metrics.width;
			const height = textObj.fontSize;

			// Draw selection box
			this.ctx.strokeStyle = this.selectionColor;
			this.ctx.lineWidth = 2;
			this.ctx.setLineDash([5, 5]);
			this.ctx.strokeRect(textObj.x - 2, textObj.y - height - 2, width + 4, height + 4);
			this.ctx.setLineDash([]);
			this.ctx.restore();
		}

		// Draw selection highlight for strokes
		if (this.selectedStrokeIndex >= 0 && this.selectedStrokeIndex < this.strokes.length) {
			const bounds = this.getStrokeBounds(this.selectedStrokeIndex);
			if (bounds) {
				this.ctx.save();
				this.ctx.strokeStyle = this.selectionColor;
				this.ctx.lineWidth = 2;
				this.ctx.setLineDash([5, 5]);
				this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
				this.ctx.setLineDash([]);
				this.ctx.restore();
			}
		}

		// Draw multi-selection highlights
		if (this.selectedTextIndices.length > 0 || this.selectedStrokeIndices.length > 0) {
			this.ctx.save();
			this.ctx.strokeStyle = this.selectionColor;
			this.ctx.lineWidth = 2;
			this.ctx.setLineDash([5, 5]);

			// Draw highlights for selected text objects
			for (let idx of this.selectedTextIndices) {
				if (idx >= 0 && idx < this.textObjects.length) {
					const textObj = this.textObjects[idx];
					this.ctx.font = `${textObj.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
					const metrics = this.ctx.measureText(textObj.text);
					const width = metrics.width;
					const height = textObj.fontSize;
					this.ctx.strokeRect(textObj.x - 2, textObj.y - height - 2, width + 4, height + 4);
				}
			}

			// Draw highlights for selected strokes
			for (let idx of this.selectedStrokeIndices) {
				if (idx >= 0 && idx < this.strokes.length) {
					const bounds = this.getStrokeBounds(idx);
					if (bounds) {
						this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
					}
				}
			}

			this.ctx.setLineDash([]);
			this.ctx.restore();
		}

		// Draw drag selection rectangle if actively dragging
		if (this.isDraggingSelection) {
			const rect = this.getSelectionRect();
			this.ctx.save();
			this.ctx.strokeStyle = this.selectionColor;
			this.ctx.lineWidth = 2;
			this.ctx.setLineDash([5, 5]);
			this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
			// Convert hex color to rgba with 0.1 opacity
			const rgb = this.hexToRgb(this.selectionColor);
			this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`;
			this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
			this.ctx.setLineDash([]);
			this.ctx.restore();
		}

		// Redraw lines
		if (this.showLines) {
			this.drawRuledLines();
		}
	}

	deleteSelectedObject() {
		if (this.selectedTextIndex >= 0) {
			this.textObjects.splice(this.selectedTextIndex, 1);
			this.selectedTextIndex = -1;
			this.redrawWithSelection();
			this.saveState();
			new Notice('Text deleted');
		} else if (this.selectedStrokeIndex >= 0) {
			// For stroke deletion, use undo to remove
			new Notice('Use eraser or undo to remove strokes');
			this.selectedStrokeIndex = -1;
			this.redrawWithSelection();
		}
	}

	duplicateSelectedObject() {
		if (this.selectedTextIndex >= 0 && this.selectedTextIndex < this.textObjects.length) {
			const textObj = this.textObjects[this.selectedTextIndex];
			const duplicate = {
				text: textObj.text,
				x: textObj.x + 20,
				y: textObj.y + 20,
				fontSize: textObj.fontSize,
				color: textObj.color
			};
			this.textObjects.push(duplicate);
			this.selectedTextIndex = this.textObjects.length - 1;
			this.redrawWithSelection();
			this.saveState();
			new Notice('Text duplicated');
		} else if (this.selectedStrokeIndex >= 0 && this.selectedStrokeIndex < this.strokes.length) {
			// Duplicate stroke by offsetting all points and preserving metadata
			const stroke = this.strokes[this.selectedStrokeIndex];
			const points = this.getStrokePoints(stroke);

			const duplicatePoints = points.map(point => ({
				x: point.x + 20,
				y: point.y + 20,
				pressure: point.pressure
			}));

			// Create new stroke with same metadata as original
			const duplicateStroke = {
				points: duplicatePoints,
				penType: Array.isArray(stroke) ? this.penType : stroke.penType,
				penColor: Array.isArray(stroke) ? this.penColor : stroke.penColor,
				baseLineWidth: Array.isArray(stroke) ? this.baseLineWidth : stroke.baseLineWidth
			};

			this.strokes.push(duplicateStroke);
			this.selectedStrokeIndex = this.strokes.length - 1;

			// Redraw the duplicated stroke on canvas using original metadata
			this.redrawStroke(duplicateStroke);

			this.saveState();
			this.redrawWithSelection();
			new Notice('Stroke duplicated');
		}
	}

	showContextMenu(canvasX, canvasY, screenX = null, screenY = null) {
		// Remove any existing context menu
		this.hideContextMenu();

		// Get canvas wrapper position to properly position menu
		const canvasRect = this.canvas.getBoundingClientRect();
		const containerRect = this.containerEl.getBoundingClientRect();

		// Calculate position relative to the container element
		// screenX/screenY are viewport coordinates, we need container-relative coordinates
		let posX, posY;
		if (screenX !== null && screenY !== null) {
			// Convert screen coordinates to container-relative coordinates
			posX = screenX - containerRect.left;
			posY = screenY - containerRect.top;
		} else {
			// Fallback: convert canvas coordinates to screen coordinates, then to container-relative
			posX = canvasRect.left + canvasX - containerRect.left;
			posY = canvasRect.top + canvasY - containerRect.top;
		}

		// Create context menu
		const menu = document.createElement('div');
		menu.className = 'handwrite-context-menu';
		menu.style.position = 'absolute'; // Position relative to container
		menu.style.left = `${posX}px`;
		menu.style.top = `${posY}px`;
		menu.style.zIndex = '1000';

		const textIndex = this.getTextObjectAtPosition(canvasX, canvasY);
		const strokeIndex = this.getStrokeAtPosition(canvasX, canvasY);
		const hasSelection = textIndex >= 0 || strokeIndex >= 0;

		// Menu items
		const items = [];

		if (textIndex >= 0) {
			// Select text first if not already selected
			if (this.selectedTextIndex !== textIndex) {
				this.selectedTextIndex = textIndex;
				this.selectedStrokeIndex = -1;
				this.isPartialSelection = false;
				this.redrawWithSelection();
			}

			items.push(
				{ label: 'Copy', action: () => this.copyTextObject(this.selectedTextIndex) },
				{ label: 'Cut', action: () => this.cutTextObject(this.selectedTextIndex) },
				{ label: 'Duplicate', action: () => this.duplicateSelectedObject() },
				{ label: 'Delete', action: () => this.deleteSelectedObject() },
				{ separator: true },
				{ label: 'Resize Text...', action: () => this.resizeTextObject(this.selectedTextIndex) }
			);
		} else if (strokeIndex >= 0) {
			// Select stroke first if not already selected
			if (this.selectedStrokeIndex !== strokeIndex) {
				this.selectedTextIndex = -1;
				this.selectedStrokeIndex = strokeIndex;
				this.isPartialSelection = false;
				this.redrawWithSelection();
			}

			items.push(
				{ label: 'Duplicate', action: () => this.duplicateSelectedObject() },
				{ label: 'Delete', action: () => this.deleteSelectedObject() }
			);
		}

		// Always show paste if clipboard has content
		items.push(
			{ separator: hasSelection },
			{ label: 'Paste', action: () => this.pasteTextAtPosition(canvasX, canvasY) }
		);

		// Build menu
		items.forEach(item => {
			if (item.separator) {
				const separator = menu.createEl('div', { cls: 'handwrite-context-menu-separator' });
			} else {
				const menuItem = menu.createEl('div', {
					text: item.label,
					cls: 'handwrite-context-menu-item'
				});
				menuItem.addEventListener('click', () => {
					item.action();
					this.hideContextMenu();
				});
			}
		});

		// Add to DOM
		this.containerEl.appendChild(menu);
		this.contextMenu = menu;

		// Close menu when clicking outside
		const closeHandler = (e) => {
			if (!menu.contains(e.target)) {
				this.hideContextMenu();
				document.removeEventListener('pointerdown', closeHandler);
			}
		};
		setTimeout(() => {
			document.addEventListener('pointerdown', closeHandler);
		}, 10);
	}

	hideContextMenu() {
		if (this.contextMenu) {
			this.contextMenu.remove();
			this.contextMenu = null;
		}
	}

	async cutTextObject(index) {
		if (index < 0 || index >= this.textObjects.length) return;

		await this.copyTextObject(index);
		this.deleteTextObject(index);
		new Notice('Text cut to clipboard');
	}

	async resizeTextObject(index) {
		if (index < 0 || index >= this.textObjects.length) return;

		const textObj = this.textObjects[index];
		const newSize = prompt('Enter new font size (8-72):', textObj.fontSize.toString());

		if (newSize !== null) {
			const size = parseInt(newSize);
			if (!isNaN(size) && size >= 8 && size <= 72) {
				textObj.fontSize = size;
				this.redrawWithSelection();
				this.saveState();
				new Notice(`Font size changed to ${size}px`);
			} else {
				new Notice('Invalid font size. Must be between 8 and 72.');
			}
		}
	}

	async pasteTextAtPosition(x, y) {
		try {
			const text = await navigator.clipboard.readText();
			if (text) {
				const textObj = {
					text: text,
					x: x,
					y: y,
					fontSize: this.fontSize,
					color: this.penColor
				};
				this.textObjects.push(textObj);
				this.renderTextObjects();
				this.saveState();
				new Notice('Text pasted');
			}
		} catch (error) {
			console.error('Paste failed:', error);
			new Notice('Failed to paste text');
		}
	}

	clearCanvas() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.strokes = [];
		this.editMode = false;
		this.originalText = null;
		this.textRegions = [];
		this.textObjects = []; // Clear pasted text objects

		// Hide edit mode controls
		if (this.spacingContainer) {
			this.spacingContainer.style.display = 'none';
		}
		if (this.reloadBtn) {
			this.reloadBtn.style.display = 'none';
		}

		// Save the cleared state WITHOUT lines
		this.saveState();

		// Redraw lines AFTER saving (they're just guides, not saved content)
		if (this.showLines) {
			this.drawRuledLines();
		}

		new Notice('Canvas cleared');
	}

	loadTextForEditing(text, selection, startX = null, startY = null, clearCanvas = true) {
		this.editMode = true;
		this.originalText = text;
		this.originalSelection = selection;

		// Show spacing controls and reload button
		if (this.spacingContainer) {
			this.spacingContainer.style.display = 'flex';
		}
		if (this.reloadBtn) {
			this.reloadBtn.style.display = 'block';
		}

		// Only clear canvas if requested (for edit mode with selection)
		if (clearCanvas) {
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.strokes = [];
		}
		this.textRegions = [];

		// Setup text drawing - use appropriate color based on theme
		this.isDarkMode = this.getEffectiveDarkMode();
		this.ctx.fillStyle = this.isDarkMode ? '#cccccc' : '#555555';

		// Use the fontSize setting for pasted text
		const fontSize = this.fontSize;
		this.ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

		const padding = 40;
		const maxWidth = this.canvas.width - (padding * 2);

		// Split text into words
		const words = text.split(/\s+/);

		// Use provided position or defaults
		let x = startX !== null ? startX : padding;
		let y = startY !== null ? startY : padding + fontSize;

		// Draw each word with custom spacing
		for (let i = 0; i < words.length; i++) {
			const word = words[i];
			const metrics = this.ctx.measureText(word);
			const wordWidth = metrics.width;

			// Check if word fits on current line
			if (x + wordWidth > this.canvas.width - padding && x > padding) {
				// Move to next line
				x = padding;
				y += this.lineSpacing;
			}

			// Draw the word
			this.ctx.fillText(word, x, y);

			// Store word region for scribble detection
			this.textRegions.push({
				word: word,
				x: x,
				y: y - 20,
				width: wordWidth,
				height: 30,
				index: i
			});

			// Move x position with custom word spacing
			x += wordWidth + this.wordSpacing;
		}

		new Notice('Edit mode: Adjust spacing, write between words, or scribble over words to delete');
	}

	insertTextToActiveNote(text) {
		const { MarkdownView } = require('obsidian');

		// Try to get the active markdown view first
		let activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

		// If canvas is focused, find the most recently used markdown view
		if (!activeView) {
			const leaves = this.app.workspace.getLeavesOfType('markdown');
			if (leaves.length > 0) {
				// Get the first (most recent) markdown leaf
				activeView = leaves[0].view;
			}
		}

		if (activeView) {
			const editor = activeView.editor;
			const cursor = editor.getCursor();
			editor.replaceRange(text, cursor);
			new Notice('Text inserted into note');
		} else {
			new Notice('No markdown note found. Open a note first.');
		}
	}

	replaceTextInActiveNote(text, selection) {
		const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
		if (activeView) {
			const editor = activeView.editor;
			if (selection) {
				editor.replaceRange(text, selection.from, selection.to);
				new Notice('Text replaced in note');
			} else {
				const cursor = editor.getCursor();
				editor.replaceRange(text, cursor);
				new Notice('Text inserted into note');
			}
		} else {
			new Notice('No active note found. Open a note first.');
		}
	}

	async extractText() {
		if (this.strokes.length === 0) {
			new Notice('No handwriting found. Draw something first.');
			return;
		}

		const settings = this.plugin.settings;
		const provider = settings.ocrProvider || 'myscript';

		// Check if API keys are configured for selected provider
		if (provider === 'myscript') {
			if (!settings.myScriptAppKey || !settings.myScriptHmacKey) {
				new Notice('MyScript API keys not configured. Go to Settings > Handwrite to add your keys.');
				return;
			}
		} else if (provider === 'google') {
			if (!settings.googleCloudApiKey) {
				new Notice('Google Cloud API key not configured. Go to Settings > Handwrite to add your key.');
				return;
			}
		}

		new Notice(`Extracting text with ${provider === 'myscript' ? 'MyScript' : 'Google Cloud Vision'}...`);

		try {
			if (provider === 'myscript') {
				await this.extractTextWithMyScript();
			} else if (provider === 'google') {
				await this.extractTextWithGoogle();
			}
		} catch (error) {
			console.error('OCR Error:', error);
			new Notice(`OCR failed: ${error.message}`);
		}
	}

	async extractTextWithMyScript() {
		const settings = this.plugin.settings;

		// Convert strokes to MyScript format
		const strokeGroups = [{
			strokes: this.strokes.map(stroke => ({
				x: stroke.points.map(p => p.x),
				y: stroke.points.map(p => p.y)
			}))
		}];

		const requestBody = {
			contentType: 'Text',
			configuration: {
				lang: 'en_US',
				export: {
					'text/plain': {}
				}
			},
			strokeGroups: strokeGroups
		};

		try {
			// Authentication
			const applicationKey = settings.myScriptAppKey;
			const hmacKey = settings.myScriptHmacKey;

			const headers = {
				'Content-Type': 'application/json',
				'Accept': 'application/json,text/plain',
				'applicationKey': applicationKey
			};

			// Add HMAC if key is provided (optional for some applications)
			// User key is concatenation of applicationKey + hmacKey
			if (hmacKey && hmacKey.trim() !== '') {
				const userKey = applicationKey + hmacKey;
				headers['hmac'] = await this.generateHmac(userKey, JSON.stringify(requestBody));
			}

			const response = await fetch('https://cloud.myscript.com/api/v4.0/iink/batch', {
				method: 'POST',
				headers: headers,
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				const errorText = await response.text();

				// Check for quota exceeded errors
				if (response.status === 403) {
					throw new Error(`MyScript quota exceeded! You've used all 2000 free requests this month. Wait until next month or enable billing at developer.myscript.com`);
				}

				throw new Error(`MyScript API error: ${response.status} - ${errorText}`);
			}

			// Check Content-Type to determine how to parse the response
			const contentType = response.headers.get('Content-Type') || '';
			let extractedText = '';

			if (contentType.includes('text/plain')) {
				// Response is plain text - use it directly
				extractedText = await response.text();
			} else if (contentType.includes('application/json')) {
				// Response is JSON - parse and extract text
				const result = await response.json();
				if (result.exports && result.exports['text/plain']) {
					extractedText = result.exports['text/plain'];
				} else if (result.label) {
					extractedText = result.label;
				} else {
					throw new Error('No text found in MyScript response');
				}
			} else {
				// Unknown content type - try to read as text
				extractedText = await response.text();
			}

			// Increment usage counter
			this.plugin.settings.myScriptUsageCount++;
			await this.plugin.saveSettings();
			console.log('MyScript usage:', this.plugin.settings.myScriptUsageCount, '/2000');

			// Show in modal
			new ExtractedTextModal(this.app, extractedText, (finalText) => {
				this.insertTextToActiveNote(finalText);
			}).open();

		} catch (error) {
			console.error('MyScript Error:', error);
			throw error;
		}
	}

	async generateHmac(key, message) {
		// Convert key and message to Uint8Array
		const encoder = new TextEncoder();
		const keyData = encoder.encode(key);
		const messageData = encoder.encode(message);

		// Import key for HMAC
		const cryptoKey = await crypto.subtle.importKey(
			'raw',
			keyData,
			{ name: 'HMAC', hash: 'SHA-512' },
			false,
			['sign']
		);

		// Generate signature
		const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

		// Convert to hex string
		return Array.from(new Uint8Array(signature))
			.map(b => b.toString(16).padStart(2, '0'))
			.join('');
	}

	async extractTextWithGoogle() {
		const settings = this.plugin.settings;

		try {
			// Create a temporary canvas to render only the strokes
			const tempCanvas = document.createElement('canvas');
			const bounds = this.getStrokeBounds();

			// Add padding
			const padding = 20;
			tempCanvas.width = bounds.width + (padding * 2);
			tempCanvas.height = bounds.height + (padding * 2);

			const tempCtx = tempCanvas.getContext('2d');

			// White background for better OCR
			tempCtx.fillStyle = 'white';
			tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

			// Draw all strokes (offset by bounds and padding)
			for (const stroke of this.strokes) {
				const penType = stroke.penType || 'regular';
				const penColor = stroke.penColor || '#000000';
				const baseLineWidth = stroke.baseLineWidth || 3;

				// Force black strokes on white background for best OCR contrast
				tempCtx.strokeStyle = '#000000';
				tempCtx.lineCap = 'round';
				tempCtx.lineJoin = 'round';

				for (let i = 1; i < stroke.points.length; i++) {
					const prevPoint = stroke.points[i - 1];
					const point = stroke.points[i];

					// Adjust coordinates
					const x1 = prevPoint.x - bounds.minX + padding;
					const y1 = prevPoint.y - bounds.minY + padding;
					const x2 = point.x - bounds.minX + padding;
					const y2 = point.y - bounds.minY + padding;

					// Make strokes bolder for better OCR recognition
					let lineWidth = Math.max(baseLineWidth * 1.5, 4);
					if (penType === 'calligraphy') {
						const dx = x2 - x1;
						const dy = y2 - y1;
						const angle = Math.atan2(dy, dx);
						const nibAngle = Math.PI / 4; // 45 degrees
						const variation = Math.abs(Math.cos(angle - nibAngle));
						lineWidth = Math.max(baseLineWidth * 1.5, 4) * (0.3 + variation * 0.7);
					}

					tempCtx.lineWidth = lineWidth;
					tempCtx.beginPath();
					tempCtx.moveTo(x1, y1);
					tempCtx.lineTo(x2, y2);
					tempCtx.stroke();
				}
			}

			// Convert canvas to base64 image
			const imageDataUrl = tempCanvas.toDataURL('image/png');
			const imageBase64 = imageDataUrl.split(',')[1];

			// Call Google Cloud Vision API
			const apiKey = settings.googleCloudApiKey;
			const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

			const requestBody = {
				requests: [{
					image: {
						content: imageBase64
					},
					features: [{
						type: 'DOCUMENT_TEXT_DETECTION',
						maxResults: 1
					}]
				}]
			};

			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				const errorText = await response.text();

				// Check for quota exceeded errors
				if (response.status === 429) {
					throw new Error(`Google Cloud Vision quota exceeded! You've used all 1000 free requests this month. Wait until next month or check billing at console.cloud.google.com`);
				}

				if (response.status === 403 && errorText.includes('billing')) {
					throw new Error(`Google Cloud Vision billing issue: ${errorText}`);
				}

				throw new Error(`Google Cloud API error: ${response.status} - ${errorText}`);
			}

			const result = await response.json();

			// Extract text from response
			let extractedText = '';
			if (result.responses && result.responses[0]) {
				const annotation = result.responses[0];

				if (annotation.fullTextAnnotation) {
					extractedText = annotation.fullTextAnnotation.text;
				} else if (annotation.textAnnotations && annotation.textAnnotations.length > 0) {
					extractedText = annotation.textAnnotations[0].description;
				} else {
					throw new Error('No text found in Google Cloud response. Try writing more clearly or using a larger pen size.');
				}
			} else {
				throw new Error('Invalid response from Google Cloud Vision API');
			}

			// Increment usage counter
			this.plugin.settings.googleCloudUsageCount++;
			await this.plugin.saveSettings();
			console.log('Google Cloud Vision usage:', this.plugin.settings.googleCloudUsageCount, '/1000');

			// Show in modal
			new ExtractedTextModal(this.app, extractedText, (finalText) => {
				this.insertTextToActiveNote(finalText);
			}).open();

		} catch (error) {
			console.error('Google Cloud Vision Error:', error);
			throw error;
		}
	}

	getStrokeBounds() {
		let minX = Infinity, minY = Infinity;
		let maxX = -Infinity, maxY = -Infinity;

		for (const stroke of this.strokes) {
			for (const point of stroke.points) {
				minX = Math.min(minX, point.x);
				minY = Math.min(minY, point.y);
				maxX = Math.max(maxX, point.x);
				maxY = Math.max(maxY, point.y);
			}
		}

		return {
			minX,
			minY,
			maxX,
			maxY,
			width: maxX - minX,
			height: maxY - minY
		};
	}

	async onClose() {
		// Cleanup resize observer
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}
	}
}

// Modal to show extracted text
class ExtractedTextModal extends Modal {
	constructor(app, extractedText, onSubmit) {
		super(app);
		this.extractedText = extractedText;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Extracted Text' });
		contentEl.createEl('p', {
			text: 'Review and edit the extracted text:',
			cls: 'modal-description'
		});

		const textarea = contentEl.createEl('textarea', {
			cls: 'extracted-text-area'
		});
		textarea.value = this.extractedText;
		textarea.rows = 10;

		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

		const copyBtn = buttonContainer.createEl('button', {
			text: 'Copy to Clipboard',
			cls: 'mod-cta'
		});
		copyBtn.addEventListener('click', async () => {
			await navigator.clipboard.writeText(textarea.value);
			new Notice('Text copied to clipboard!');
			this.close();
		});

		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => {
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// Modal to show diff comparison
class DiffModal extends Modal {
	constructor(app, originalText, extractedText, selection, scribbledIndices, onApply) {
		super(app);
		this.originalText = originalText;
		this.extractedText = extractedText;
		this.selection = selection;
		this.scribbledIndices = scribbledIndices || new Set();
		this.onApply = onApply;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('diff-modal');

		contentEl.createEl('h2', { text: 'Compare Changes' });
		contentEl.createEl('p', {
			text: 'Review the differences between original and edited text:',
			cls: 'modal-description'
		});

		// Create comparison container
		const comparisonContainer = contentEl.createDiv({ cls: 'comparison-container' });

		// Original text section
		const originalSection = comparisonContainer.createDiv({ cls: 'text-section' });
		originalSection.createEl('h3', { text: 'Original Text' });
		const originalTextarea = originalSection.createEl('textarea', {
			cls: 'diff-text-area original-text'
		});
		originalTextarea.value = this.originalText;
		originalTextarea.rows = 10;
		originalTextarea.readOnly = true;

		// Extracted text section (editable)
		const extractedSection = comparisonContainer.createDiv({ cls: 'text-section' });
		extractedSection.createEl('h3', { text: 'Edited Text (from handwriting)' });
		const extractedTextarea = extractedSection.createEl('textarea', {
			cls: 'diff-text-area extracted-text'
		});
		extractedTextarea.value = this.extractedText;
		extractedTextarea.rows = 10;

		// Diff summary
		const diffSummary = contentEl.createDiv({ cls: 'diff-summary' });
		const originalWords = this.originalText.split(/\s+/).length;
		const extractedWords = this.extractedText.split(/\s+/).length;
		const wordDiff = extractedWords - originalWords;
		diffSummary.createEl('p', {
			text: `Word count: ${originalWords} → ${extractedWords} (${wordDiff > 0 ? '+' : ''}${wordDiff})`,
			cls: 'diff-stats'
		});

		if (this.scribbledIndices && this.scribbledIndices.size > 0) {
			diffSummary.createEl('p', {
				text: `Scribbled deletions: ${this.scribbledIndices.size} word(s) removed`,
				cls: 'diff-stats scribble-info'
			});
		}

		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

		const applyBtn = buttonContainer.createEl('button', {
			text: 'Apply Changes',
			cls: 'mod-cta'
		});
		applyBtn.addEventListener('click', () => {
			this.onApply(extractedTextarea.value);
			this.close();
		});

		const keepOriginalBtn = buttonContainer.createEl('button', {
			text: 'Keep Original'
		});
		keepOriginalBtn.addEventListener('click', () => {
			this.close();
		});

		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => {
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// Modal for saving canvas with a name
class SaveCanvasModal extends Modal {
	constructor(app, view, defaultName = '') {
		super(app);
		this.view = view;
		this.defaultName = defaultName;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Save Canvas' });
		contentEl.createEl('p', { text: 'Enter a name for this canvas:' });

		const inputContainer = contentEl.createDiv({ cls: 'canvas-save-input' });
		const input = inputContainer.createEl('input', {
			type: 'text',
			placeholder: 'e.g., "My Drawing", "Notes 2024-03-01"',
			attr: { value: this.defaultName }
		});
		input.style.width = '100%';
		input.style.padding = '8px';
		input.style.marginBottom = '15px';

		// Show existing canvases
		const existingNames = this.view.getSavedCanvasNames().filter(name => name !== 'autosave');
		if (existingNames.length > 0) {
			contentEl.createEl('p', { text: 'Existing canvases:', cls: 'setting-item-description' });
			const list = contentEl.createEl('ul', { cls: 'canvas-list' });
			list.style.maxHeight = '150px';
			list.style.overflowY = 'auto';
			list.style.marginBottom = '15px';
			existingNames.forEach(name => {
				const item = list.createEl('li');
				item.setText(name);
				item.style.cursor = 'pointer';
				item.style.padding = '4px';
				item.addEventListener('click', () => {
					input.value = name;
					input.focus();
				});
			});
		}

		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

		const saveBtn = buttonContainer.createEl('button', {
			text: 'Save',
			cls: 'mod-cta'
		});
		saveBtn.addEventListener('click', async () => {
			const name = input.value.trim();
			if (!name) {
				new Notice('Please enter a canvas name');
				return;
			}
			await this.view.saveCanvasData(name);
			new Notice(`Canvas saved as "${name}"`);
			this.close();
		});

		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => {
			this.close();
		});

		// Focus input and select all
		setTimeout(() => {
			input.focus();
			input.select();
		}, 10);

		// Allow Enter key to save
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				saveBtn.click();
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// Modal for loading a saved canvas
class LoadCanvasModal extends Modal {
	constructor(app, view) {
		super(app);
		this.view = view;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Load Canvas' });
		contentEl.createEl('p', { text: 'Select a canvas to load:' });

		const savedNames = this.view.getSavedCanvasNames();
		if (savedNames.length === 0) {
			contentEl.createEl('p', {
				text: 'No saved canvases found. Draw something and save it first!',
				cls: 'setting-item-description'
			});

			const okBtn = contentEl.createEl('button', { text: 'OK', cls: 'mod-cta' });
			okBtn.addEventListener('click', () => this.close());
			return;
		}

		const list = contentEl.createDiv({ cls: 'canvas-load-list' });
		list.style.maxHeight = '400px';
		list.style.overflowY = 'auto';

		savedNames.forEach(name => {
			const canvasData = this.view.plugin.settings.savedCanvases[name];
			const item = list.createDiv({ cls: 'canvas-load-item' });
			item.style.padding = '12px';
			item.style.marginBottom = '8px';
			item.style.border = '1px solid var(--background-modifier-border)';
			item.style.borderRadius = '4px';
			item.style.cursor = 'pointer';

			const nameEl = item.createEl('div', { text: name });
			nameEl.style.fontWeight = 'bold';
			nameEl.style.marginBottom = '4px';

			const info = item.createEl('div', { cls: 'setting-item-description' });
			info.style.fontSize = '12px';
			const strokeCount = canvasData.strokes?.length || 0;
			const textCount = canvasData.textObjects?.length || 0;
			const savedAt = canvasData.savedAt ? new Date(canvasData.savedAt).toLocaleString() : 'Unknown';
			info.setText(`${strokeCount} strokes, ${textCount} text objects - Saved: ${savedAt}`);

			// Hover effect
			item.addEventListener('mouseenter', () => {
				item.style.backgroundColor = 'var(--background-modifier-hover)';
			});
			item.addEventListener('mouseleave', () => {
				item.style.backgroundColor = '';
			});

			// Load button
			const buttonContainer = item.createDiv({ cls: 'canvas-load-buttons' });
			buttonContainer.style.marginTop = '8px';
			buttonContainer.style.display = 'flex';
			buttonContainer.style.gap = '8px';

			const loadBtn = buttonContainer.createEl('button', { text: 'Load', cls: 'mod-cta' });
			loadBtn.addEventListener('click', async (e) => {
				e.stopPropagation();
				await this.view.loadCanvasData(name);
				new Notice(`Loaded canvas "${name}"`);
				this.close();
			});

			// Delete button (except for autosave)
			if (name !== 'autosave') {
				const deleteBtn = buttonContainer.createEl('button', { text: 'Delete', cls: 'mod-warning' });
				deleteBtn.addEventListener('click', async (e) => {
					e.stopPropagation();
					if (confirm(`Delete canvas "${name}"?`)) {
						await this.view.deleteCanvasData(name);
						new Notice(`Deleted canvas "${name}"`);
						this.onOpen(); // Refresh the list
					}
				});
			}
		});

		const cancelBtn = contentEl.createEl('button', { text: 'Cancel' });
		cancelBtn.style.marginTop = '15px';
		cancelBtn.addEventListener('click', () => {
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// Main Plugin
// Default settings
const DEFAULT_SETTINGS = {
	selectionColor: '#00aaff', // Default blue
	enableFullColorPicker: false, // Simple white/black/grey by default
	ocrProvider: 'myscript', // 'myscript' or 'google'
	myScriptAppKey: '', // MyScript application key
	myScriptHmacKey: '', // MyScript HMAC key
	googleCloudApiKey: '', // Google Cloud Vision API key
	myScriptUsageCount: 0, // Track MyScript API usage
	googleCloudUsageCount: 0, // Track Google Cloud API usage
	usageResetDate: '', // Last reset date for usage tracking
	savedCanvases: {} // Multiple saved canvases: { "name": { strokes, textObjects, canvasMode, zoom }, ... }
};

// Settings tab
class HandwriteSettingTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Handwrite Plugin Settings' });

		new Setting(containerEl)
			.setName('Enable full color picker')
			.setDesc('Show full color picker in toolbar. When disabled, only white/black/grey quick-select buttons are shown (recommended for handwriting).')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableFullColorPicker)
				.onChange(async (value) => {
					this.plugin.settings.enableFullColorPicker = value;
					await this.plugin.saveSettings();
					new Notice('Please reload the canvas for this setting to take effect', 5000);
				}));

		new Setting(containerEl)
			.setName('Selection color')
			.setDesc('Color for selection rectangles and drag-to-select boxes (for accessibility)')
			.addDropdown(dropdown => dropdown
				.addOption('#00aaff', 'Blue (default)')
				.addOption('#ffffff', 'White')
				.addOption('#cccccc', 'Light Grey')
				.addOption('#808080', 'Medium Grey')
				.addOption('#404040', 'Dark Grey')
				.addOption('#000000', 'Black')
				.setValue(this.plugin.settings.selectionColor)
				.onChange(async (value) => {
					this.plugin.settings.selectionColor = value;
					await this.plugin.saveSettings();
					// Update all open canvas views
					const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CALLIGRAPHY);
					for (let leaf of leaves) {
						if (leaf.view instanceof CalligraphyCanvasView) {
							leaf.view.selectionColor = value;
							leaf.view.redrawWithSelection();
						}
					}
					new Notice(`Selection color changed to ${value}`);
				}));

		// OCR Settings
		containerEl.createEl('h3', { text: 'OCR Settings' });

		new Setting(containerEl)
			.setName('OCR Provider')
			.setDesc('Choose which OCR service to use for handwriting recognition')
			.addDropdown(dropdown => dropdown
				.addOption('myscript', 'MyScript (2000 free/month, 98% accuracy)')
				.addOption('google', 'Google Cloud Vision (1000 free/month)')
				.setValue(this.plugin.settings.ocrProvider || 'myscript')
				.onChange(async (value) => {
					this.plugin.settings.ocrProvider = value;
					await this.plugin.saveSettings();
					new Notice(`OCR provider changed to ${value === 'myscript' ? 'MyScript' : 'Google Cloud Vision'}`);
				}));

		// API Usage Tracking
		containerEl.createEl('h4', { text: 'API Usage Tracking' });

		const myScriptUsage = this.plugin.settings.myScriptUsageCount || 0;
		const googleCloudUsage = this.plugin.settings.googleCloudUsageCount || 0;

		const usageContainer = containerEl.createDiv({ cls: 'usage-tracking-container' });
		usageContainer.style.padding = '10px';
		usageContainer.style.backgroundColor = 'var(--background-secondary)';
		usageContainer.style.borderRadius = '6px';
		usageContainer.style.marginBottom = '15px';

		const myScriptUsageEl = usageContainer.createDiv();
		myScriptUsageEl.innerHTML = `<strong>MyScript:</strong> ${myScriptUsage} / 2000 requests`;
		myScriptUsageEl.style.marginBottom = '8px';
		myScriptUsageEl.style.fontSize = '14px';

		const googleCloudUsageEl = usageContainer.createDiv();
		googleCloudUsageEl.innerHTML = `<strong>Google Cloud Vision:</strong> ${googleCloudUsage} / 1000 requests`;
		googleCloudUsageEl.style.fontSize = '14px';

		new Setting(containerEl)
			.setName('Reset usage counters')
			.setDesc('Reset API usage tracking for both providers (do this at the start of each month)')
			.addButton(button => button
				.setButtonText('Reset All Counters')
				.onClick(async () => {
					this.plugin.settings.myScriptUsageCount = 0;
					this.plugin.settings.googleCloudUsageCount = 0;
					this.plugin.settings.usageResetDate = new Date().toISOString();
					await this.plugin.saveSettings();
					new Notice('API usage counters reset!');
					this.display(); // Refresh the settings display
				}));

		// MyScript Settings
		containerEl.createEl('h4', { text: 'MyScript Settings' });

		containerEl.createEl('p', {
			text: 'Sign up for a free MyScript developer account at: ',
			cls: 'setting-item-description'
		});

		const myScriptLink = containerEl.createEl('a', {
			text: 'https://developer.myscript.com',
			href: 'https://developer.myscript.com'
		});
		myScriptLink.style.display = 'block';
		myScriptLink.style.marginBottom = '10px';

		new Setting(containerEl)
			.setName('MyScript Application Key')
			.setDesc('Your MyScript application key from developer.myscript.com')
			.addText(text => text
				.setPlaceholder('Enter your application key')
				.setValue(this.plugin.settings.myScriptAppKey || '')
				.onChange(async (value) => {
					this.plugin.settings.myScriptAppKey = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('MyScript HMAC Key')
			.setDesc('Your MyScript HMAC key from developer.myscript.com')
			.addText(text => text
				.setPlaceholder('Enter your HMAC key')
				.setValue(this.plugin.settings.myScriptHmacKey || '')
				.onChange(async (value) => {
					this.plugin.settings.myScriptHmacKey = value.trim();
					await this.plugin.saveSettings();
				}));

		// Google Cloud Settings
		containerEl.createEl('h4', { text: 'Google Cloud Vision Settings' });

		containerEl.createEl('p', {
			text: 'Get your API key from Google Cloud Console: ',
			cls: 'setting-item-description'
		});

		const googleLink = containerEl.createEl('a', {
			text: 'https://console.cloud.google.com',
			href: 'https://console.cloud.google.com'
		});
		googleLink.style.display = 'block';
		googleLink.style.marginBottom = '10px';

		new Setting(containerEl)
			.setName('Google Cloud API Key')
			.setDesc('Your Google Cloud Vision API key (1000 free requests/month)')
			.addText(text => text
				.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.googleCloudApiKey || '')
				.onChange(async (value) => {
					this.plugin.settings.googleCloudApiKey = value.trim();
					await this.plugin.saveSettings();
				}));
	}
}

class CalligraphyNotesPlugin extends Plugin {
	async onload() {
		console.log('Loading Calligraphy Notes plugin');

		// Load settings
		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new HandwriteSettingTab(this.app, this));

		// Register view
		this.registerView(
			VIEW_TYPE_CALLIGRAPHY,
			(leaf) => new CalligraphyCanvasView(leaf, this)
		);

		// Add ribbon icon
		this.addRibbonIcon('pen-tool', 'Open Calligraphy Canvas', () => {
			this.activateView();
		});

		// Add command
		this.addCommand({
			id: 'open-calligraphy-canvas',
			name: 'Open Calligraphy Canvas',
			callback: () => {
				this.activateView();
			}
		});

		// Add command to extract from existing image
		this.addCommand({
			id: 'extract-text-from-image',
			name: 'Extract text from image file',
			callback: async () => {
				await this.extractFromImageFile();
			}
		});

		// Add command to edit selected text with handwriting
		this.addCommand({
			id: 'edit-text-with-handwriting',
			name: 'Edit selected text with handwriting',
			editorCallback: (editor, view) => {
				const selection = editor.getSelection();
				if (!selection) {
					new Notice('Please select text to edit first');
					return;
				}

				// Get selection range
				const from = editor.getCursor('from');
				const to = editor.getCursor('to');

				// Open canvas and load text
				this.activateView().then(() => {
					const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CALLIGRAPHY);
					if (leaves.length > 0) {
						const canvasView = leaves[0].view;
						canvasView.loadTextForEditing(selection, { from, to });
					}
				});
			}
		});
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_CALLIGRAPHY);

		if (leaves.length > 0) {
			// View already exists, reveal it
			leaf = leaves[0];
		} else {
			// Create new leaf in right sidebar
			leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({
				type: VIEW_TYPE_CALLIGRAPHY,
				active: true
			});
		}

		workspace.revealLeaf(leaf);
	}

	async extractFromImageFile() {
		try {
			// Get list of image files in vault
			const files = this.app.vault.getFiles().filter(f =>
				/\.(png|jpg|jpeg|gif|bmp)$/i.test(f.path)
			);

			if (files.length === 0) {
				new Notice('No image files found in vault');
				return;
			}

			// For simplicity, use the most recently modified image
			// In a full implementation, you'd show a file picker
			files.sort((a, b) => b.stat.mtime - a.stat.mtime);
			const imageFile = files[0];

			new Notice(`Extracting text from ${imageFile.name}...`);

			// Get image path
			const imagePath = this.app.vault.adapter.getFullPath(imageFile.path);
			const tempDir = os.tmpdir();
			const outputPath = path.join(tempDir, `ocr-${Date.now()}`);

			// Use explicit bash shell with full PATH for OCR
			const tesseractCmd = '/usr/bin/tesseract';
			const envPath = process.env.PATH || '/usr/local/bin:/usr/bin:/bin';
			const ocrCommand = `/bin/bash -c 'PATH=${envPath} ${tesseractCmd} "${imagePath}" "${outputPath}" -l eng --psm 3'`;

			console.log(`Running image OCR: ${ocrCommand}`);
			await execAsync(ocrCommand);

			// Read result
			const textPath = `${outputPath}.txt`;
			let extractedText = await fs.readFile(textPath, 'utf8');
			extractedText = extractedText.trim();

			// Cleanup
			await fs.unlink(textPath).catch(() => {});

			if (!extractedText) {
				new Notice('No text could be extracted from the image.');
				return;
			}

			// Show in modal
			new ExtractedTextModal(this.app, extractedText, (finalText) => {
				const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
				if (activeView) {
					const editor = activeView.editor;
					const cursor = editor.getCursor();
					editor.replaceRange(finalText, cursor);
					new Notice('Text inserted into note');
				}
			}).open();

		} catch (error) {
			console.error('Image OCR Error:', error);
			new Notice(`OCR failed: ${error.message}`);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		console.log('Unloading Calligraphy Notes plugin');
	}
}

module.exports = CalligraphyNotesPlugin;

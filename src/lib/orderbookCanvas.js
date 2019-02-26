import { BaseCanvas } from './baseCanvas';
import { memoryOrderbook } from './orderbook';
import BigNumber from 'bignumber.js';
import { rgbaEaseOut, toRGBA } from './canvasUtils';

export class CanvasOrderbook extends BaseCanvas {
  static defaultOptions = {
    drawFromBottom: false,
    priceColor: '#00b488',
    side: 'buy',
    fontSize: 12,
    rowHeight: 16,
    height: 2000,
    deleteDelay: 300,
    updateDelay: 2000,
    rowBackgroundColor: '#222',
    greenHoverBackgroundColor: '#333',
    redHoverBackgroundColor: '#333',
    greenRGB: [17, 17, 17],
    redRGB: [17, 17, 17],
    amountColor: '#fff',
    showFPS: true,
    priceDecimals: 6,
    amountDecimals: 4,

    // bar, amount, price, mySize
    columnsWidth: [0.1, 0.3, 0.3, 0.2],
    dataOrder: 'asc'
  };

  aggregatedData = [];
  maxAmount = new BigNumber(0);
  priceRightAt = 0;
  amountRightAt = 0;
  myAmountRightAt = 0;

  constructor(id, options) {
    super(id, options);
    this.options = { ...CanvasOrderbook.defaultOptions, ...options };

    if (options.side === 'buy') {
      this.aggregatedData = memoryOrderbook.aggregatedBids;
    } else {
      this.aggregatedData = memoryOrderbook.aggregatedAsks;
    }

    this.installOptions();
    this.bindEvents();
  }

  installOptions() {
    this.amountRightAt = this.canvas.width * this.options.columnsWidth[0];
    this.priceRightAt = this.canvas.width * (this.options.columnsWidth[0] + this.options.columnsWidth[1]);
    this.myAmountRightAt =
      this.canvas.width * (this.options.columnsWidth[0] + this.options.columnsWidth[1] + this.options.columnsWidth[2]);
  }

  onResizeWidth() {
    this.installOptions();
  }

  getRowNumberByPosition = (x, y) => {
    if (this.options.drawFromBottom) {
      return Math.floor((this.canvas.height - y) / (this.options.rowHeight * this.ratio));
    } else {
      return Math.floor(y / (this.options.rowHeight * this.ratio));
    }
  };

  drawBackground() {
    this.ctx.fillStyle = this.options.rowBackgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawHoverRow() {
    if (this.x < 0 || this.y < 0) {
      return;
    }

    const { greenHoverBackgroundColor, redHoverBackgroundColor, rowHeight, side } = this.options;
    const rowNumber = this.getRowNumberByPosition(this.x, this.y);
    if (rowNumber >= this.aggregatedData.length) {
      return;
    }

    const rowY = this.options.drawFromBottom
      ? this.canvas.height - (rowNumber + 1) * rowHeight * this.ratio
      : rowNumber * rowHeight * this.ratio;

    this.ctx.fillStyle = side === 'buy' ? greenHoverBackgroundColor : redHoverBackgroundColor;
    this.ctx.fillRect(0, rowY, this.canvas.width, rowHeight * this.ratio);
  }

  getDecimalsForPrice = () => {
    let { priceDecimals } = this.options;
    const aggregation = memoryOrderbook.aggregation.toString();
    const pointerIndex = aggregation.indexOf('.');
    if (pointerIndex === -1) {
      return 0;
    } else {
      return Math.min(priceDecimals, aggregation.length - pointerIndex - 1);
    }
  };

  drawPrice(number, x, y, color) {
    const priceDecimals = this.getDecimalsForPrice();
    let numberText = number.toFixed(priceDecimals);
    this.ctx.fillStyle = color;
    this.ctx.fillText(numberText, x, y);
  }

  drawAmount(number, x, y, color) {
    const { amountDecimals } = this.options;

    this.ctx.fillStyle = color;
    let numberText = number.toString();
    let pointIndex = numberText.indexOf('.');
    let nextText = '';
    if (pointIndex > -1) {
      if (numberText.length - pointIndex - 1 < amountDecimals) {
        nextText = '0'.repeat(amountDecimals - (numberText.length - pointIndex - 1));
      }
    } else if (amountDecimals > 0) {
      nextText = `.${'0'.repeat(amountDecimals)}`;
    }

    this.ctx.fillText(numberText, x - this.ctx.measureText(nextText).width, y);

    if (nextText) {
      this.ctx.fillStyle = '#97999a';
      this.ctx.fillText(nextText, x, y);
    }
  }

  drawMySize(size, x, y) {
    if (size.eq(0)) {
      this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
      this.ctx.fillText('-', x, y);
    } else {
      this.drawAmount(size, x, y, this.options.amountColor);
    }
  }

  drawRow(rowNumber, timer, rowData) {
    const {
      drawFromBottom,
      height,
      rowHeight,
      deleteDelay,
      amountColor,
      priceColor,
      updateDelay,
      side,
      greenRGB,
      redRGB
    } = this.options;
    const price = rowData[0];
    const amount = rowData[1];

    const mySize = rowData[2];
    const deleting = rowData.deleting;
    let deletingTimer = rowData.deletingTimer;
    const updating = rowData.updating;
    let updatingTimer = rowData.updatingTimer;

    let _priceColor = priceColor,
      _amountColor = amountColor;

    const rowY = drawFromBottom
      ? height * this.ratio - (rowNumber + 1) * rowHeight * this.ratio
      : rowNumber * rowHeight * this.ratio;

    if (deleting) {
      if (!deletingTimer) {
        rowData.deletingTimer = timer;
        deletingTimer = timer;
      }

      const past = timer - deletingTimer;

      if (past > deleteDelay) {
        const index = this.aggregatedData.indexOf(rowData);
        if (index > -1) {
          this.aggregatedData.splice(index, 1);
          return;
        }
      } else {
        _priceColor = 'gray';
        _amountColor = 'gray';

        const rgba = rgbaEaseOut(
          side === 'buy' ? greenRGB.concat(0.1) : redRGB.concat(0.1),
          side === 'buy' ? greenRGB.concat(0.3) : redRGB.concat(0.3),
          past,
          deleteDelay
        );
        this.ctx.fillStyle = `rgba(${rgba.join()})`;
        this.ctx.fillRect(0, rowY, this.canvas.width, rowHeight * this.ratio);
      }
    } else if (updating) {
      if (!updatingTimer) {
        rowData.updatingTimer = timer;
        updatingTimer = timer;
      }

      const past = timer - updatingTimer;
      if (past > updateDelay) {
        delete rowData.updatingTimer;
        delete rowData.updating;
      } else {
        const rgba = rgbaEaseOut(toRGBA(priceColor), [255, 255, 255, 1], past, updateDelay);
        _amountColor = `rgba(${rgba.join()})`;
      }
    }

    this.ctx.fillStyle = `rgba(${toRGBA(priceColor)
      .slice(0, 3)
      .join()},0.1)`;
    this.ctx.fillRect(
      0,
      rowY,
      Math.floor((this.canvas.width * amount) / this.maxAmount.toNumber()),
      rowHeight * this.ratio
    );

    const fontY = rowY + ((this.options.rowHeight - this.options.fontSize) / 2) * this.ratio;
    this.drawPrice(price, this.priceRightAt, fontY, _priceColor);
    this.drawAmount(amount, this.amountRightAt, fontY, _amountColor);
    this.drawMySize(mySize, this.myAmountRightAt, fontY);
  }

  drawRows(timer) {
    this.limitMaxFPS(5, () => {
      // clear mySizes
      for (let x of this.aggregatedData) {
        x[2] = new BigNumber(0);
      }
    });

    for (let i = 0; i < this.aggregatedData.length; i++) {
      this.drawRow(i, timer, this.aggregatedData[i]);
    }
  }

  getMaxAmount() {
    this.maxAmount = new BigNumber(0);
    // tslint:disable-next-line
    for (let i = 0; i < this.aggregatedData.length; i++) {
      if (this.aggregatedData[i][1].gt(this.maxAmount)) {
        this.maxAmount = this.aggregatedData[i][1];
      }
    }
  }

  drawFrame = timer => {
    this.ctx.font = `${this.options.fontSize * this.ratio}px Roboto`;
    // this.ctx.textBaseline = 'top';
    this.ctx.textBaseline = 'top';
    this.ctx.textAlign = 'right';

    this.getMaxAmount();
    this.drawBackground();
    this.drawHoverRow();
    this.drawRows(timer);
  };

  bindEvents() {
    this.canvas.onmousedown = e => {
      e.preventDefault();
      e.stopPropagation();

      if (!this.options.onClick) {
        return;
      }
      const x = e.offsetX * this.ratio;
      const y = e.offsetY * this.ratio;
      const rowNumber = this.getRowNumberByPosition(x, y);
      let totalAmount = new BigNumber(0);
      let totalQuoteAmount = new BigNumber(0);

      if (!this.aggregatedData[rowNumber]) {
        return;
      }

      for (let i = 0; i <= rowNumber; i++) {
        totalAmount = totalAmount.add(this.aggregatedData[i][1]);
        totalQuoteAmount = totalQuoteAmount.add(this.aggregatedData[i][1].times(this.aggregatedData[i][0]));
      }

      const price = this.aggregatedData[rowNumber][0];
      const amount = this.aggregatedData[rowNumber][1];

      const result = {
        side: this.options.side,
        x,
        y,
        clickOnPriceSide: x > this.amountRightAt + 20,
        price,
        amount,
        totalQuoteAmount,
        totalAmount
      };

      this.options.onClick(result);
    };
  }
}

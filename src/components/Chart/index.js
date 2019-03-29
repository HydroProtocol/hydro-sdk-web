import React, { Component } from 'react';
import { format } from 'd3-format';
import { timeFormat } from 'd3-time-format';
import { curveMonotoneX } from 'd3-shape';
import { ChartCanvas, Chart } from 'react-stockcharts';
import { BarSeries, CandlestickSeries, AreaSeries } from 'react-stockcharts/lib/series';
import { XAxis, YAxis } from 'react-stockcharts/lib/axes';
import { EdgeIndicator, CrossHairCursor, MouseCoordinateX, MouseCoordinateY } from 'react-stockcharts/lib/coordinates';
import { discontinuousTimeScaleProvider } from 'react-stockcharts/lib/scale';
import { fitDimensions, fitWidth } from 'react-stockcharts/lib/helper';
import { last } from 'react-stockcharts/lib/utils';
import { ema } from 'react-stockcharts/lib/indicator';
import { MovingAverageTooltip, OHLCTooltip } from 'react-stockcharts/lib/tooltip';
import { connect } from 'react-redux';
import { testData, granularityOptions } from './constans';
import Selector from '../Selector';
import axios from 'axios';
import './styles.scss';
// one candle width is 18px * 0.5
const CANDLE_WIDTH_AND_GAP = 18;

class Trade extends Component {
  constructor(props) {
    const granularityStr = window.localStorage.getItem('granularityStr') || '1d';
    const chart = 'line';

    super(props);
    this.state = {
      chart,
      granularityStr,
      loading: false,
      noData: false,
      data: [],
      from: null,
      to: null,
      start: null,
      end: null,
      lastUpdatedAt: new Date().getTime() // for loadRight
    };
  }

  componentDidMount() {
    this.loadData();
    this.interval = window.setInterval(() => this.loadRight(), 60000);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.currentMarket.id !== this.props.currentMarket.id) {
      this.setState({
        from: null,
        to: null,
        data: [],
        noData: false
      });
      this.loadData();
    }
  }

  componentWillUnmount() {
    if (this.interval) {
      window.clearInterval(this.interval);
    }
  }

  async loadRight() {
    if (new Date().getTime() - this.state.lastUpdatedAt > 59000) {
      this.loadData(this.state.granularityStr, this.state.to);
    }
  }

  async loadLeft(start, end) {
    this.loadData(this.state.granularityStr, null, this.state.from, start, end);
  }

  async loadData(granularityStr = null, from = null, to = null, start = null, end = null) {
    const granularityIsSame = this.state.granularityStr === granularityStr;
    if (this.state.loading || (granularityIsSame && this.state.noData)) {
      return;
    }
    if (!granularityIsSame && this.state.noData) {
      this.setState({ noData: false });
    }
    this.setState({ loading: true });

    const params = this.generateParams(granularityStr || this.state.granularityStr, from, to);
    if (granularityStr) {
      this.setState({ granularityStr });
    }

    let res;
    try {
      res = await axios.get(
        `https://api.ddex.io/v3/markets/${this.props.currentMarket.id}/tradingView?from=${params.from}&to=${
          params.to
        }&granularity=${params.granularityNum}`
      );
      if (res.data.data.meta && res.data.data.meta.noData) {
        this.setState({ loading: false, noData: true });
        return;
      }
    } catch (e) {
      this.setState({ loading: false });
      return;
    }
    const newData = this.fixData(res.data.data.candles);
    const changeState = {
      data: newData,
      from: params.from,
      to: params.to,
      start: null,
      end: null,
      lastUpdatedAt: new Date().getTime()
    };

    if (granularityIsSame) {
      if (this.state.from && this.state.from > params.from) {
        // loadLeft
        changeState.to = this.state.to;
        changeState.data = [...newData, ...this.state.data];
        changeState.start = start + newData.length;
        changeState.end =
          end + newData.length > start + newData.length + this.fitLengthToShow()
            ? end + newData.length
            : start + newData.length + this.fitLengthToShow();
      }
      if (this.state.to && this.state.to < params.to) {
        // loadRight
        changeState.from = this.state.from;
        changeState.data = this.fixData([...this.state.data, ...newData]);
      }
    }

    this.setState(changeState);
    this.setState({ loading: false });
  }

  handleLoadMore(start, end) {
    start = Math.ceil(start);
    if (start === end) {
      return;
    }
    this.loadLeft(start, end);
  }

  fixData(data) {
    const fd = []; // fixedData
    const granularityNum = this.generateParams(this.state.granularityStr).granularityNum;
    for (let i = 0; i < data.length; i++) {
      data[i].open = parseFloat(data[i].open);
      data[i].high = parseFloat(data[i].high);
      data[i].low = parseFloat(data[i].low);
      data[i].close = parseFloat(data[i].close);
      data[i].volume = parseFloat(data[i].volume);
      let scale = Math.ceil((data[i].time || data[i].date) / 1000 / granularityNum);
      let gap = i === 0 ? -1 : scale - fd[fd.length - 1].date;
      if (i === 0 || gap === 1) {
        fd.push({
          date: scale,
          open: data[i].open,
          high: data[i].high,
          low: data[i].low,
          close: data[i].close,
          volume: data[i].volume
        });
        continue;
      }
      let lastFd = fd[fd.length - 1];
      if (gap === 0) {
        let volume = lastFd.volume + data[i].volume;
        if (
          lastFd.open === data[i].open &&
          lastFd.high === data[i].high &&
          lastFd.low === data[i].low &&
          lastFd.close === data[i].close &&
          lastFd.volume === data[i].volume
        ) {
          volume = lastFd.volume;
        }
        fd[fd.length - 1] = {
          date: scale,
          open: lastFd.open,
          high: Math.max(lastFd.high, data[i].high),
          low: Math.min(lastFd.low, data[i].low),
          close: data[i].close,
          volume
        };
      } else if (gap > 1) {
        for (let j = 1; j < gap; j++) {
          fd.push({
            date: lastFd.date + j,
            open: lastFd.close,
            high: lastFd.close,
            low: lastFd.close,
            close: lastFd.close,
            volume: 0
          });
        }
        fd.push({
          date: scale,
          open: data[i].open,
          high: data[i].high,
          low: data[i].low,
          close: data[i].close,
          volume: data[i].volume
        });
      }
    }
    for (let i = 0; i < fd.length; i++) {
      fd[i].date = new Date(fd[i].date * 1000 * granularityNum);
    }
    return fd;
  }

  generateParams(granularityStr, from = null, to = null) {
    let granularityNum;
    to = to || Math.floor(new Date().getTime() / 1000);
    switch (granularityStr) {
      case '5m':
        granularityNum = 60 * 5;
        from = from || to - (60 * 60 * 24 * 365) / 12; // 356 * 24 points, from 1 month ago
        break;
      case '1h':
        granularityNum = 60 * 60;
        from = from || to - 60 * 60 * 24 * 365; // 356 * 24 points, from 1 year ago
        break;
      case '1d':
        granularityNum = 60 * 60 * 24;
        from = from || to - 60 * 60 * 24 * 365; // 356 points, from 1 year ago
        break;
      default:
        // same as 1h
        granularityNum = 60 * 60;
        from = from || to - 60 * 60 * 24 * 365;
        break;
    }

    return {
      from,
      to,
      granularityNum
    };
  }

  fitLengthToShow() {
    const { width } = this.props;
    return Math.ceil((width - 50) / CANDLE_WIDTH_AND_GAP);
  }

  selectEMA(value) {
    if (value === 'ema12') {
      this.setState({ isShowEMA12: !this.state.isShowEMA12 });
      window.localStorage.setItem('isShowEMA12', !this.state.isShowEMA12);
    } else if (value === 'ema26') {
      this.setState({ isShowEMA26: !this.state.isShowEMA26 });
      window.localStorage.setItem('isShowEMA26', !this.state.isShowEMA26);
    }
  }

  render() {
    const { width, ratio, height, currentMarket } = this.props;
    const chartGreenColor = '#3da1a5';
    const chartRedColor = '#b83741';
    const textGrayColor = '#97999a';
    const barColor = '#f7f7f7';

    const ema26 = ema()
      .id(0)
      .options({ windowSize: 26 })
      .merge((d, c) => {
        d.ema26 = c;
      })
      .accessor(d => d.ema26);

    const ema12 = ema()
      .id(1)
      .options({ windowSize: 12 })
      .merge((d, c) => {
        d.ema12 = c;
      })
      .accessor(d => d.ema12);

    const xScaleProvider = discontinuousTimeScaleProvider.inputDateAccessor(d => d.date);
    let fixedData = this.state.data;
    if (fixedData.length === 0) {
      const elem = {
        date: new Date(),
        open: 0,
        high: 0,
        low: 0,
        close: 0,
        volume: 0
      };
      fixedData = [elem, elem];
    } else if (fixedData.length === 1) {
      fixedData = [
        fixedData[0],
        {
          date: fixedData[0].date,
          open: fixedData[0].close,
          high: fixedData[0].close,
          low: fixedData[0].close,
          close: fixedData[0].close,
          volume: 0
        }
      ];
    }
    const calculatedData = ema12(ema26(fixedData));
    const { data, xScale, xAccessor, displayXAccessor } = xScaleProvider(calculatedData);

    const dataLen = data.length;
    const fitLen = this.fitLengthToShow();
    let xExtents = [dataLen - 1, dataLen - 1 - fitLen + 1];
    if (fitLen < dataLen) {
      const start = this.state.start || xAccessor(last(data));
      const end = this.state.end || xAccessor(data[Math.max(0, dataLen - fitLen)]);
      xExtents = [start, end];
    }

    const chartHeight = height;

    const MovingAverageTooltipOptions = [];
    if (this.state.isShowEMA26) {
      MovingAverageTooltipOptions.push({
        yAccessor: ema26.accessor(),
        type: ema26.type(),
        stroke: ema26.stroke(),
        windowSize: ema26.options().windowSize
      });
    }
    if (this.state.isShowEMA12) {
      MovingAverageTooltipOptions.push({
        yAccessor: ema12.accessor(),
        type: ema12.type(),
        stroke: ema12.stroke(),
        windowSize: ema12.options().windowSize
      });
    }
    const priceDecimals = currentMarket.priceDecimals;
    let maxHigh = 0;
    for (let i = 0; i < fixedData.length; i++) {
      if (fixedData[i].high > maxHigh) {
        maxHigh = fixedData[i].high;
      }
    }
    const priceLen = Math.floor(maxHigh).toString().length + priceDecimals;
    const marginRight = priceLen > 5 ? priceLen * 9 : 50;
    return (
      <>
        <div className="title flex justify-content-between align-items-center">
          <div>
            <div>Charts</div>
            <div className="text-secondary">Recent trading patterns</div>
          </div>
          <Selector
            options={granularityOptions}
            selectedValue={this.state.granularityStr}
            handleClick={option => {
              this.loadData(option.value);
              window.localStorage.setItem('granularityStr', option.value);
            }}
          />
        </div>
        <div style={{ height: '100%', position: 'relative' }} className="flex-column">
          {this.state.loading && <i className="fa fa-spinner fa-spin chartLoading" />}
          {!(this.state.loading || this.state.data.length === 0) && (
            <ChartCanvas
              height={chartHeight}
              ratio={ratio}
              width={width}
              margin={{ left: 0, right: marginRight, top: 10, bottom: 30 }}
              type={'svg'}
              seriesName="MSFT"
              data={data}
              xScale={this.state.xScale || xScale}
              xAccessor={this.state.xAccessor || xAccessor}
              displayXAccessor={this.state.displayXAccessor || displayXAccessor}
              onLoadMore={(start, end) => this.handleLoadMore(start, end)}
              pointsPerPxThreshold={2}
              minPointsPerPxThreshold={1 / 50}
              xExtents={xExtents}>
              <Chart
                id={2}
                height={chartHeight * 0.3}
                width={width}
                yExtents={d => d.volume}
                origin={(w, h) => [0, h - chartHeight * 0.3]}>
                <XAxis
                  axisAt="bottom"
                  orient="bottom"
                  tickStroke={textGrayColor}
                  stroke="none"
                  ticks={Math.ceil((width - marginRight) / 160)}
                />
                <MouseCoordinateX at="bottom" orient="bottom" displayFormat={timeFormat('%Y-%m-%d')} />
                <BarSeries yAccessor={d => d.volume} fill={barColor} widthRatio={0.4} opacity={1} />
              </Chart>
              <Chart
                id={1}
                yExtents={[d => [d.high, d.low], ema26.accessor(), ema12.accessor()]}
                height={chartHeight * 0.8}
                width={width}
                padding={{ left: 0, right: 0, top: 1, bottom: 1 }}>
                <YAxis
                  axisAt="right"
                  orient="right"
                  ticks={5}
                  tickStroke={textGrayColor}
                  stroke="none"
                  tickFormat={format(`.${priceDecimals}f`)}
                />
                {this.state.chart === 'candle' ? (
                  <CandlestickSeries
                    widthRatio={0.5}
                    opacity={1}
                    candleStrokeWidth="1"
                    stroke={d => (d.close > d.open ? chartGreenColor : chartRedColor)}
                    wickStroke={d => (d.close > d.open ? chartGreenColor : chartRedColor)}
                    fill={d => (d.close > d.open ? 'none' : chartRedColor)}
                  />
                ) : (
                  <AreaSeries
                    yAccessor={d => d.close}
                    strokeWidth={2}
                    stroke={chartGreenColor}
                    fill="url(#LineGradient)"
                    interpolation={curveMonotoneX}
                  />
                )}
                <MovingAverageTooltip
                  origin={[15, 8]}
                  textFill={textGrayColor}
                  options={MovingAverageTooltipOptions}
                  displayFormat={format(`.${priceDecimals}f`)}
                  width={priceDecimals > 5 ? 65 + 6 * (priceDecimals - 5) : 65}
                />
                <defs>
                  <linearGradient id="LineGradient" x1="0" y1="100%" x2="0" y2="0%">
                    <stop offset="0%" stopColor={chartGreenColor} stopOpacity={0} />
                    <stop offset="50%" stopColor={chartGreenColor} stopOpacity={0.1} />
                    <stop offset="100%" stopColor={chartGreenColor} stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <EdgeIndicator
                  itemType="last"
                  orient="right"
                  edgeAt="right"
                  yAccessor={d => d.close}
                  fill={d => (d.close > d.open ? chartGreenColor : chartRedColor)}
                  lineStroke={d => (d.close > d.open ? chartGreenColor : chartRedColor)}
                  strokeWidth={0}
                  displayFormat={format(`.${priceDecimals}f`)}
                  rectWidth={priceLen > 5 ? priceLen * 9 : 50}
                />
                <MouseCoordinateY
                  at="right"
                  orient="right"
                  displayFormat={format(`.${priceDecimals}f`)}
                  rectWidth={priceLen > 5 ? priceLen * 9 : 50}
                />
                <OHLCTooltip
                  origin={[12, -2]}
                  textFill={textGrayColor}
                  labelFill={textGrayColor}
                  ohlcFormat={v => format(`.${priceDecimals}f`)(v) + '  '}
                />
              </Chart>
              <CrossHairCursor stroke="#FFFFFF" />
            </ChartCanvas>
          )}
        </div>
      </>
    );
  }
}

const mapStateToProps = state => {
  return {
    currentMarket: state.market.getIn(['markets', 'currentMarket'])
  };
};

export default connect(mapStateToProps)(fitWidth(fitDimensions(Trade)));

import $ from 'jquery'
import { Chart, LineController, LineElement, PointElement, LinearScale, TimeScale, Title, Tooltip } from 'chart.js'
import 'chartjs-adapter-luxon'
import humps from 'humps'
import numeral from 'numeral'
import { DateTime } from 'luxon'
import { formatUsdValue } from '../lib/currency'
import sassVariables from '../../css/export-vars-to-js.module.scss'

Chart.defaults.font.family = '"Roboto Mono", monospace, Nunito, "Helvetica Neue", Arial, sans-serif,"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"'
Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, Title, Tooltip)

const grid = {
  display: false,
  drawBorder: false,
  drawOnChartArea: false
}

const gridX = {
  display: true,
  color: getLabelColor("rgba(0, 0, 0, 0.2)", 'rgba(255, 255, 255, 0.2)'),
  borderDash: [1, 1],
  drawBorder: true,
  drawOnChartArea: true
}

function getTxChartColor () {
  if (localStorage.getItem('current-color-mode') === 'dark') {
    return sassVariables.dashboardLineColorTransactionsDarkTheme
  } else {
    return sassVariables.dashboardBannerChartAxisFontColor
  }
}

function getLabelColor (color, darkColor) {
  return localStorage.getItem('current-color-mode') === 'dark' ? darkColor : color
}

function getPriceChartColor () {
  if (localStorage.getItem('current-color-mode') === 'dark') {
    return sassVariables.dashboardLineColorPriceDarkTheme
  } else {
    return sassVariables.dashboardLineColorPrice
  }
}

function getMarketCapChartColor () {
  if (localStorage.getItem('current-color-mode') === 'dark') {
    return sassVariables.dashboardLineColorMarketDarkTheme
  } else {
    return sassVariables.dashboardLineColorMarket
  }
}

function xAxe (fontColor) {
  if (localStorage.getItem('current-color-mode') === 'dark') {
    fontColor = 'white'
  }
  return {
    grid: grid,
    type: 'time',
    time: {
      unit: 'day',
      tooltipFormat: 'DD',
      stepSize: 14
    },
    ticks: {
      color: fontColor,
      font: {
        family: '"Roboto Mono", monospace',
        size: 12,
        weight: '500',
        lineHeight: 1
      }
    }
  }
}

const padding = {
  left: 25,
}

const legend = {
  display: false
}

function formatValue (val) {
  return `${numeral(val).format('0,0')}`
}

const config = {
  type: 'line',
  responsive: true,
  data: {
    datasets: []
  },
  options: {
    layout: {
      padding
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    scales: {
      x: xAxe(sassVariables.dashboardBannerChartAxisFontColor),
      price: {
        position: 'left',
        grid: gridX,
        ticks: {
          beginAtZero: true,
          callback: (value, _index, _values) => `$${numeral(value).format('0,0.00')}`,
          maxTicksLimit: 4,
          color: sassVariables.dashboardBannerChartAxisFontColor
        }
      },
      marketCap: {
        position: 'right',
        grid: gridX,
        ticks: {
          callback: (_value, _index, _values) => '',
          maxTicksLimit: 6,
          drawOnChartArea: false,
          color: sassVariables.dashboardBannerChartAxisFontColor
        }
      },
      numTransactions: {
        position: 'right',
        grid: gridX,
        ticks: {
          beginAtZero: true,
          callback: (value, _index, _values) => formatValue(value),
          maxTicksLimit: 4,
          color: getLabelColor(sassVariables.dashboardBannerChartAxisFontColor, 'white'),
          font: {
            family: '"Roboto Mono", monospace',
            size: 12,
            weight: '500',
            lineHeight: 1
          }
        }
      }
    },
    plugins: {
      legend,
      title: {
        display: true,
        color: sassVariables.dashboardBannerChartAxisFontColor
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            const { label } = context.dataset
            const { formattedValue, parsed } = context
            if (context.dataset.yAxisID === 'price') {
              return `${label}: ${formatUsdValue(parsed.y)}`
            } else if (context.dataset.yAxisID === 'marketCap') {
              return `${label}: ${formatUsdValue(parsed.y)}`
            } else if (context.dataset.yAxisID === 'numTransactions') {
              return `${label}: ${formattedValue}`
            } else {
              return formattedValue
            }
          }
        }
      }
    }
  }
}

function getDataFromLocalStorage (key) {
  const data = window.localStorage.getItem(key)
  return data ? JSON.parse(data) : []
}

function setDataToLocalStorage (key, data) {
  window.localStorage.setItem(key, JSON.stringify(data))
}

function getPriceData (marketHistoryData) {
  if (marketHistoryData.length === 0) {
    return getDataFromLocalStorage('priceData')
  }
  const data = marketHistoryData.map(({ date, closingPrice }) => ({ x: date, y: closingPrice }))
  setDataToLocalStorage('priceData', data)
  return data
}

function getTxHistoryData (transactionHistory) {
  if (transactionHistory.length === 0) {
    return getDataFromLocalStorage('txHistoryData')
  }
  const data = transactionHistory.map(dataPoint => ({ x: dataPoint.date, y: dataPoint.number_of_transactions }))

  // it should be empty value for tx history the current day
  const prevDayStr = data[0].x
  const prevDay = DateTime.fromISO(prevDayStr)
  let curDay = prevDay.plus({ days: 1 })
  curDay = curDay.toISODate()
  data.unshift({ x: curDay, y: null })

  setDataToLocalStorage('txHistoryData', data)
  return data
}

function getMarketCapData (marketHistoryData, availableSupply) {
  if (marketHistoryData.length === 0) {
    return getDataFromLocalStorage('marketCapData')
  }
  const data = marketHistoryData.map(({ date, closingPrice }) => {
    const supply = (availableSupply !== null && typeof availableSupply === 'object')
      ? availableSupply[date]
      : availableSupply
    return { x: date, y: closingPrice * supply }
  })
  setDataToLocalStorage('marketCapData', data)
  return data
}

// colors for light and dark theme
const priceLineColor = getPriceChartColor()
const mcapLineColor = getMarketCapChartColor()

class MarketHistoryChart {
  constructor (el, availableSupply, _marketHistoryData, dataConfig) {
    const axes = config.options.scales

    let priceActivated = true
    let marketCapActivated = true

    this.price = {
      label: window.localized.Price,
      yAxisID: 'price',
      data: [],
      fill: false,
      cubicInterpolationMode: 'monotone',
      pointRadius: 0,
      backgroundColor: priceLineColor,
      borderColor: priceLineColor
      // lineTension: 0
    }
    if (dataConfig.market === undefined || dataConfig.market.indexOf('price') === -1) {
      this.price.hidden = true
      axes.price.display = false
      priceActivated = false
    }

    this.marketCap = {
      label: window.localized['Market Cap'],
      yAxisID: 'marketCap',
      data: [],
      fill: false,
      cubicInterpolationMode: 'monotone',
      pointRadius: 0,
      backgroundColor: mcapLineColor,
      borderColor: mcapLineColor
      // lineTension: 0
    }
    if (dataConfig.market === undefined || dataConfig.market.indexOf('market_cap') === -1) {
      this.marketCap.hidden = true
      axes.marketCap.display = false
      this.price.hidden = true
      axes.price.display = false
      marketCapActivated = false
    }

    this.numTransactions = {
      label: window.localized['Tx/day'],
      yAxisID: 'numTransactions',
      data: [],
      cubicInterpolationMode: 'monotone',
      fill: false,
      pointRadius: 0,
      backgroundColor: getTxChartColor(),
      borderColor: 'rgba(0, 51, 231, 1)',
      tension:0.4
      // lineTension: 0
    }

    if (dataConfig.transactions === undefined || dataConfig.transactions.indexOf('transactions_per_day') === -1) {
      this.numTransactions.hidden = true
      axes.numTransactions.display = false
    } else if (!priceActivated && !marketCapActivated) {
      axes.numTransactions.position = 'left'
    }

    this.availableSupply = availableSupply

    const marketChartTitle = 'Daily price and market cap'
    let chartTitle = ''
    if (Object.keys(dataConfig).join() === 'transactions') {
      chartTitle = ''
    } else if (Object.keys(dataConfig).join() === 'market') {
      chartTitle = marketChartTitle
    }
    config.options.plugins.title.text = chartTitle

    config.data.datasets = [this.price, this.marketCap, this.numTransactions]

    const isChartLoadedKey = 'isChartLoaded'
    const isChartLoaded = window.sessionStorage.getItem(isChartLoadedKey) === 'true'
    if (isChartLoaded) {
      config.options.animation = false
    } else {
      window.sessionStorage.setItem(isChartLoadedKey, true)
    }

    this.chart = new Chart(el, config)
  }

  updateMarketHistory (availableSupply, marketHistoryData) {
    this.price.data = getPriceData(marketHistoryData)
    if (this.availableSupply !== null && typeof this.availableSupply === 'object') {
      const today = new Date().toJSON().slice(0, 10)
      this.availableSupply[today] = availableSupply
      this.marketCap.data = getMarketCapData(marketHistoryData, this.availableSupply)
    } else {
      this.marketCap.data = getMarketCapData(marketHistoryData, availableSupply)
    }
    this.chart.update()
  }

  updateTransactionHistory (transactionHistory) {
    this.numTransactions.data = getTxHistoryData(transactionHistory)
    this.chart.update()
  }
  
  switchChartTheme () {
    const {scales} = config.options
    scales.numTransactions.ticks.color = getLabelColor(sassVariables.dashboardBannerChartAxisFontColor, 'white')
    scales.x = xAxe(sassVariables.dashboardBannerChartAxisFontColor)
    scales.price.grid.color,
    scales.marketCap.grid.color,
    scales.numTransactions.grid.color = getLabelColor("rgba(0, 0, 0, 0.2)", 'rgba(255, 255, 255, 0.2)')
    this.chart.update()
  }
}

export function createMarketHistoryChart (el) {
  const dataPaths = $(el).data('history_chart_paths')
  const dataConfig = $(el).data('history_chart_config')

  const $chartError = $('[data-chart-error-message]')
  const chart = new MarketHistoryChart(el, 0, [], dataConfig)
  Object.keys(dataPaths).forEach(function (historySource) {
    $.getJSON(dataPaths[historySource], { type: 'JSON' })
      .done(data => {
        switch (historySource) {
          case 'market': {
            const availableSupply = JSON.parse(data.supply_data)
            const marketHistoryData = humps.camelizeKeys(JSON.parse(data.history_data))

            $(el).show()
            chart.updateMarketHistory(availableSupply, marketHistoryData)
            break
          }
          case 'transaction': {
            const txsHistoryData = JSON.parse(data.history_data)

            $(el).show()
            chart.updateTransactionHistory(txsHistoryData)
            break
          }
        }
      })
      .fail(() => {
        $chartError.show()
      })
  })
  return chart
}

$('[data-chart-error-message]').on('click', _event => {
  $('[data-chart-error-message]').hide()
  createMarketHistoryChart($('[data-chart="historyChart"]')[0])
})

import $ from 'jquery'
import { formatAllUsdValues, updateAllCalculatedUsdValues } from '../lib/currency'
import { createMarketHistoryChart } from '../lib/history_chart'

const search = document.getElementById("main-search-autocomplete")
const searchMobile = document.getElementById("main-search-autocomplete-mobile")

$('.dark-mode-changer').click(function () {
  if (localStorage.getItem('current-color-mode') === 'dark') {
    localStorage.setItem('current-color-mode', 'light')
    document.body.className = ''
  } else {
    localStorage.setItem('current-color-mode', 'dark')
    document.body.className += " " + "dark-theme-applied";
    document.body.style.backgroundColor = "#1c1d31";

    if (search && search.style) {
          search.style.backgroundColor = "#22223a";
          search.style.borderColor = "#22223a";
    }
    if (searchMobile && searchMobile.style) {
      searchMobile.style.backgroundColor = "#22223a";
      searchMobile.style.borderColor = "#22223a";
    }
    
  }
  window.dashboardChart.switchChartTheme(document.querySelectorAll('[data-chart="historyChart"]')[0])
})

<template>
  <div id="myChart" style="width: 100%; min-height: 400px; margin-top: 1rem">
    <LineChart ref="lineRef" v-bind="lineChartProps" @chart:update="handleChartUpdate" />
  </div>
</template>

<script>
import { Chart, registerables } from 'chart.js'
import { LineChart, useLineChart } from 'vue-chart-3'
import { ref, computed, defineComponent, onMounted, onUnmounted } from 'vue'
import { useStockStore } from 'src/stores/store'
import annotationPlugin from 'chartjs-plugin-annotation'
// import { useRoute } from 'vue-router'

Chart.register(...registerables)
Chart.register(annotationPlugin)

export default defineComponent({
  name: 'StockChart',
  components: {
    LineChart,
  },
  props: {
    stockSymbol: String,
    stockExchange: String,
  },

  setup(props) {
    const store = useStockStore()
    const lastUpdatedTime = ref(null)
    const formattedArray = ref([])
    const borderColor = ref([])
    const marketOpenTimer = ref(null)

    let extraLabels = 20
    if (window.innerWidth < 900) {
      extraLabels = 60
    }
    const generateTimeLabels = () => {
      const times = []

      const startTime = new Date()
      startTime.setHours(9, 30, 0, 0) // set start time to 9:30 a.m.

      const endTime = new Date()
      endTime.setHours(16, 0, 0, 0) // set end time to 4:00 p.m.

      while (startTime <= endTime) {
        const label = startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        times.push(label)

        // Increment by 1 minute to match the new interval
        startTime.setMinutes(startTime.getMinutes() + 1)
      }

      return times
    }

    const timestamps = ref(generateTimeLabels())

    const prices = ref([])

    console.log('prices empty', prices)

    const minutePriceAdded = new Set() //tracks which minutes have been added

    const updateChart = async (price, time) => {
      console.log('Received live price update:', price, 'at time:', time)

      const currentMinute = time
      const hasMinute = timestamps.value.includes(currentMinute)

      if (hasMinute && !minutePriceAdded.has(currentMinute)) {
        // Format the new price point
        const newPricePoint = { x: time, y: parseFloat(price) }

        // Add to the end of the array to maintain chronological order
        prices.value = [...prices.value, newPricePoint.y]
        minutePriceAdded.add(currentMinute)

        // Update color without triggering chart update
        const newColor = parseFloat(price) >= store.previousClosingPrice ? '#21ba45' : '#ea4335'
        if (borderColor.value[0] !== newColor) {
          borderColor.value = [newColor]
        }

        console.log('Added new price point:', newPricePoint)
      } else {
        console.log(`⏳ Ignoring duplicate update for ${currentMinute}`)
      }
    }

    const handleChartUpdate = (chart) => {
      if (!chart || !prices.value.length) return

      // Only update if color needs to change
      const currentPrice = prices.value[prices.value.length - 1]
      const newColor = currentPrice >= store.previousClosingPrice ? '#21ba45' : '#ea4335'

      if (borderColor.value[0] !== newColor) {
        borderColor.value = [newColor]

        // Update chart options without triggering data updates
        chart.data.datasets[0].borderColor = borderColor.value
        chart.data.datasets[0].backgroundColor = borderColor.value
      }

      // Only call update once at the end
      chart.update() // Use 'none' mode to skip animations
    }
    console.log('store stockHistoryToday', store.stockHistoryToday)
    console.log('props stockSymbol', props.stockSymbol)
    const initializeChartData = async () => {
      try {
        let stockData = await store.fetchLatestTradingDay(props.stockSymbol, props.stockExchange)
        if (stockData && stockData.length > 0) {
          //fetching latest price points
          prices.value = stockData.map((point) => point.y).reverse() // Extract only the y values
          console.log('prices.value (y values only)', prices.value)
          console.log('timestamps.value (x values only)', timestamps.value)
        }

        // Use the cached quote data from store
        const quoteResponse = store.stockQuote

        // If we don't have cached quote data, fetch it
        if (!quoteResponse) {
          await store.fetchStockQuote(props.stockSymbol, props.stockExchange)
        }

        // console.log('stockData chart (array of price points):', {
        //   length: stockData.length,
        //   firstPoint: stockData[0],
        //   lastPoint: stockData[stockData.length - 1],
        //   allData: stockData,
        // })
        console.log('quoteResponse chart (quote data):', {
          close: store.stockQuote?.close,
          previousClose: store.stockQuote?.previous_close,
          allData: store.stockQuote,
        })

        // Set closing prices from quote response
        const currentClose = store.stockQuote?.close ? parseFloat(store.stockQuote.close) : null
        const previousClose = store.stockQuote?.previous_close
          ? parseFloat(store.stockQuote.previous_close)
          : null

        if (currentClose) store.setClosingPrice(currentClose)
        if (previousClose) store.setPreviousClosingPrice(previousClose)

        // Update last updated time
        lastUpdatedTime.value = timestamps.value[0] || null

        // Set initial chart color
        if (prices.value.length > 0 && store.previousClosingPrice) {
          const currentPrice = prices.value[prices.value.length - 1]
          borderColor.value = [currentPrice >= store.previousClosingPrice ? '#21ba45' : '#ea4335']
          console.log('Chart color update:', {
            currentPrice,
            previousClosingPrice: store.previousClosingPrice,
            color: borderColor.value[0],
          })
        }
      } catch (error) {
        console.error('❌ Error initializing chart data:', error)
        prices.value = []
        lastUpdatedTime.value = null
      }
    }

    // Computed property for chart data to reduce reactivity overhead
    const chartData = computed(() => ({
      labels: timestamps.value.concat(Array(extraLabels).fill('')),
      datasets: [
        {
          data: prices.value,
          backgroundColor: borderColor.value,
          borderColor: borderColor.value,
          pointRadius: 0,
          ...Array(extraLabels).fill(''),
        },
      ],
    }))

    // Options as a computed property to reduce reactivity overhead
    const chartOptions = computed(() => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 0,
      },
      plugins: {
        legend: {
          display: false,
        },
        colors: {
          forceOverride: true,
        },
        annotation: {
          annotations: {
            previousClose: {
              type: 'line',
              yMin: store.previousClosingPrice,
              yMax: store.previousClosingPrice,
              xMin: 0,
              xMax: timestamps.value.length + extraLabels,
              borderColor: '#666666',
              borderWidth: 1.5,
              borderDash: [5, 5],
              drawTime: 'beforeDatasetsDraw',
              label: {
                display: true,
                content: [
                  'Previous',
                  'Close',
                  `${(!store.isMarketOpen ? store.closingPrice : store.previousClosingPrice)?.toFixed(2) || '0.00'}`,
                ],
                position: 'end',
                backgroundColor: 'white',
                color: '#757575',
                padding: 6,
                font: {
                  size: 12,
                  weight: 'bold',
                  lineHeight: 1.2,
                },
                xAdjust: 10,
                yAdjust: -6,
              },
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            // autoSkip: true,
            // maxTicksLimit: 12,
            minRotation: 0,
            maxRotation: 0,
            autoSkip: false,
            maxTicksLimit: 4,

            callback: function (value) {
              const specificTimes = ['10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM']
              const xAxis = this.chart.scales['x']
              const label = xAxis.getLabelForValue(value)
              // Only show hour and minute
              const time = new Date(`1970/01/01 ${label}`).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })
              return specificTimes.includes(time) ? time : ''
            },
            font: {
              size: 11,
            },
          },
          min: 0,
          max: timestamps.value.length + extraLabels,
          grid: {
            display: true,
            drawOnChartArea: false,
          },
        },
        y: {
          grid: {
            display: false,
          },
          display: true,
          beginAtZero: false,
          ticks: {},
        },
      },
    }))

    const { lineChartProps, lineChartRef } = useLineChart({
      chartData,
      options: chartOptions,
    })

    const setupMarketOpenTimer = async () => {
      // Clear any existing timer first
      if (marketOpenTimer.value) {
        clearTimeout(marketOpenTimer.value)
      }

      try {
        const marketStatus = await store.fetchMarketStatus(props.stockExchange)
        console.log('Market status for timer setup:', marketStatus)

        if (!marketStatus) {
          console.error('❌ Could not fetch market status')
          return
        }

        const { is_market_open, next_open } = marketStatus
        const now = new Date()

        // If market is closed and we have next open time
        if (!is_market_open && next_open) {
          const nextOpenTime = new Date(next_open)
          const timeUntilMarketOpen = nextOpenTime.getTime() - now.getTime()

          if (timeUntilMarketOpen > 0) {
            console.log(
              `⏰ Market opens in ${Math.round(timeUntilMarketOpen / 1000 / 60)} minutes at ${nextOpenTime.toLocaleString()}`,
            )

            marketOpenTimer.value = setTimeout(async () => {
              console.log('🕒 Market just opened, fetching new data...')
              await initializeChartData()
            }, timeUntilMarketOpen)
          } else {
            console.log('Next market open time is in the past, skipping timer setup')
          }
        } else if (is_market_open) {
          console.log('🏛️ Market is currently open, no need to set up timer')
        } else {
          console.log('❓ Market status unclear or next open time not available')
        }
      } catch (error) {
        console.error('❌ Error setting up market timer:', error)
      }
    }

    onMounted(async () => {
      await initializeChartData()
      console.log('📡 Connecting WebSocket...')
      store.connectToWebSocket(props.stockSymbol, updateChart)
      await setupMarketOpenTimer()
    })

    onUnmounted(() => {
      console.log('🛑 Disconnecting WebSocket...')
      store.disconnectWebSocket()
      // Clear the market open timer if it exists
      if (marketOpenTimer.value) {
        clearTimeout(marketOpenTimer.value)
        console.log('🛑 Cleared market open timer')
      }
    })

    return {
      lineChartProps,
      lineChartRef,
      store,
      formattedArray,
      handleChartUpdate,
    }
  },
})
</script>

<style>
#myChart {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
#line-chart {
  min-height: 400px !important;
}
</style>

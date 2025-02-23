<template>
  <div id="myChart" style="width: 400px">
    <LineChart v-bind="lineChartProps" />
  </div>
</template>

<script>
import { Chart, registerables } from 'chart.js'
import { LineChart, useLineChart } from 'vue-chart-3'
import { ref, computed, defineComponent } from 'vue'
import 'chartjs-adapter-date-fns' // ✅ Required for time-based X-axis

Chart.register(...registerables)

export default defineComponent({
  name: 'App',
  components: {
    LineChart,
  },
  setup() {
    const data = ref([30, 40, 60, 70, 5])

    const chartData = computed(() => ({
      labels: [],
      datasets: [
        {
          data: data.value,
          backgroundColor: ['#77CEFF', '#0079AF', '#123E6B', '#97B0C4', '#A5C8ED'],
        },
      ],
    }))

    const options = ref({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'hour', // ✅ Show only full hours
            stepSize: 1, // ✅ Ensure one label per hour
            displayFormats: {
              hour: 'h:mm a', // ✅ Format as "11:00 AM", "12:00 PM", etc.
            },
          },
          ticks: {
            autoSkip: false, // ✅ Prevents skipping full hours
            source: 'auto',
            maxTicksLimit: 8, // ✅ Limits the number of labels to avoid clutter
          },
          min: new Date().setHours(9, 0, 0, 0), // ✅ Start at 9 AM
          max: new Date().setHours(16, 0, 0, 0), // ✅ End at 4 PM
        },
        y: { beginAtZero: false },
      },
    })

    const { lineChartProps, lineChartRef } = useLineChart({
      chartData,
      options,
    })

    return { lineChartProps, lineChartRef }
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
</style>

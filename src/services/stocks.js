import axios from 'axios'

const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY
const baseUrl = 'https://api.twelvedata.com'

const getStocksList = () => {
  return axios.get(`${baseUrl}/stocks`)
}

const getStockDetail = (symbol) => {
  return axios.get(`${baseUrl}/time_series?apikey=${apiKey}&symbol=${symbol}&interval=1min`)
}

export default {
  getStocksList,
  getStockDetail,
}

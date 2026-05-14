import axios from 'axios'

// In devcontainer Vite proxies /api → backend:8000
// In production set VITE_API_URL to the Render.com URL
const baseURL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}` : ''

const client = axios.create({ baseURL })

// Attach JWT from localStorage on every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, clear token and redirect to login
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default client

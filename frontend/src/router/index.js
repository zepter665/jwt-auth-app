import { createRouter, createWebHistory } from 'vue-router'
import SearchView from '../views/SearchView.vue'
import PlayerDetail from '../views/PlayerDetail.vue'

const routes = [
  {
    path: '/',
    name: 'Search',
    component: SearchView
  },
  {
    path: '/player/:nuid',
    name: 'PlayerDetail',
    component: PlayerDetail
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

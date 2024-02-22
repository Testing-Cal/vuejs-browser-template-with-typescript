<template>
  <div id="app">
    <div style="margin:20px">
    <router-link to="/" style="margin-right:20px">Home</router-link>
    <router-link to="/dashboard" style="margin-right:20px">Dashboard</router-link>
    <router-link to="/listing">Listing</router-link>
  </div>
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App',
};
</script>
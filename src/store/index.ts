import { createStore, StoreOptions } from "vuex";
import { type RootState } from "./types";

// interface State {
//   firstName: String;
//   lastName: String;
// }

const store: StoreOptions<RootState> = createStore({
  state: {
    firstName: "John Doe",
    lastName: "Doe",
  },
  mutations: {},
  actions: {},
  getters: {
    fullName: function (state: RootState) {
      return `${state.firstName} ${state.lastName}`;
    },
  },
});

export default store;

// import Vuex, { StoreOptions } from "vuex";
// import { RootState } from "./types";

// const store: StoreOptions<RootState> = {
//   state: {
//     firstName: "John Doe",
//     lastName: "Doe",
//   },
//   mutations: {},
//   actions: {},
//   getters: {
//     fullName: function (state) {
//       return `${state.firstName} ${state.lastName}`;
//     },
//   },
// };

// export default new Vuex.Store<RootState>(store);

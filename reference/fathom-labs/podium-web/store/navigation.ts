interface NavigationState {
	mobileMenuVisible: boolean;
}

export const useNavigationStore = defineStore('navigation', {
	state: (): NavigationState => ({
		mobileMenuVisible: false,
	}),
	actions: {

	}
});

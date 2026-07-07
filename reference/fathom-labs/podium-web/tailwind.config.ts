import type {Config} from 'tailwindcss';

export default <Partial<Config>>{
	theme: {
		extend: {
			fontSize: {
				'18': ['18px'],
			},	
			colors: {
				primary: '#979797',
			},
			zIndex: {
				'60': '60',
			},
			outlineWidth: {
				'3': '3px',
			},
			width: {
				'screen-half': '50vw',
			},
			borderWidth: {
				'3': '3px',
			},
			scale: {
				'200': '2.0',
				'300': '3.0',
				'400': '4.0'
			}
		},
		fontFamily: {
			inter: ['Inter', 'sans-serif'],
		}
	},
	plugins: [
    require('@tailwindcss/line-clamp'),
		require('@tailwindcss/forms')
  ],
}

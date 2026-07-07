import colorsys

def calculate_readbility(rgb1, rgb2):
    for r, g, b in (rgb1, rgb2):
        if not 0.0 <= r <= 1.0:
            raise ValueError("r is out of valid range (0.0 - 1.0)")
        if not 0.0 <= g <= 1.0:
            raise ValueError("g is out of valid range (0.0 - 1.0)")
        if not 0.0 <= b <= 1.0:
            raise ValueError("b is out of valid range (0.0 - 1.0)")

    l1 = relative_luminance(*rgb1)
    l2 = relative_luminance(*rgb2)

    if l1 > l2:
        return (l1 + 0.05) / (l2 + 0.05)
    else:
        return (l2 + 0.05) / (l1 + 0.05)

def relative_luminance(r, g, b):
    r = linearize(r)
    g = linearize(g)
    b = linearize(b)

    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def linearize(v):
    if v <= 0.03928:
        return v / 12.92
    else:
        return ((v + 0.055) / 1.055) ** 2.4
    
def calculate_colorfulness(rgb):
    rgb = list(rgb)
    rgb.sort()
    min = rgb[0]
    
    rgb.reverse()
    max = rgb[0]

    return ((max + min) * (max-min)) / max
    
def calculate_alts(rgb_values):
    hsv_values = colorsys.rgb_to_hsv(rgb_values[0], rgb_values[1], rgb_values[2])
    alt_one_hsv_values = (hsv_values[0], 0.85, 0.85)
    alt_two_hsv_values = (hsv_values[0], 0.10, 0.90)
    
    alt_one_rgb_values = colorsys.hsv_to_rgb(alt_one_hsv_values[0], alt_one_hsv_values[1], alt_one_hsv_values[2])
    alt_two_rgb_values = colorsys.hsv_to_rgb(alt_two_hsv_values[0], alt_two_hsv_values[1], alt_two_hsv_values[2])
    
    return alt_one_rgb_values, alt_two_rgb_values
    
def get_color_from_rgb(rgb_values):
    hsv_values = colorsys.rgb_to_hsv(rgb_values[0], rgb_values[1], rgb_values[2])
    colorfulness = calculate_colorfulness(rgb_values)
    colorfulness = colorfulness #* ((hsv_values[1] + hsv_values[2]) / 2)

    #TODO: Find a better way
    if colorfulness <= 0.30:
        colorfulness = 0
    elif colorfulness <= 0.50:
        colorfulness = 2    
    elif colorfulness <= 0.70:
        colorfulness = 3
    else: 
        colorfulness = 5
        
    alt_one_hsv_values = (hsv_values[0], hsv_values[1], hsv_values[2] - 0.25)
    if hsv_values[2] <= 0.50:
        alt_one_hsv_values = (hsv_values[0], hsv_values[1], hsv_values[2] + 0.25)
    alt_one_rgb_values = colorsys.hsv_to_rgb(alt_one_hsv_values[0], alt_one_hsv_values[1], alt_one_hsv_values[2])
    
    white = (1,1,1)
    black = (0,0,0)
    black_readability = calculate_readbility(black, rgb_values)
    white_readability = calculate_readbility(white, rgb_values)
    text_rgb_values = black
    readability = black_readability
    if white_readability > black_readability:
        text_rgb_values = white
        readability = white_readability

    return {
        'rgb_color': [int(rgb_values[0] * 255), int(rgb_values[1] * 255), int(rgb_values[2] * 255)],
        'rgb_values': rgb_values,
        'hsv_values': hsv_values,
        'colorfulness': colorfulness,
        'text_rgb_values': text_rgb_values,
        'text_rgb_color': [text_rgb_values[0] * 255, text_rgb_values[1] * 255, text_rgb_values[2] * 255],
        'readability': readability,
        'alt_one_rgb_color': [int(alt_one_rgb_values[0] * 255), int(alt_one_rgb_values[1] * 255), int(alt_one_rgb_values[2] * 255)],
    }
    
def get_color_from_palette(colors):
    formated_colors = []
    selected_color = {}
    
    if colors and len(colors) > 0 and colors != ['0,0,0']:
        try:    
            for index, color in enumerate(colors[:4]):
                rgb_values = list(map(lambda v: int(v), color.split(',')))
                rgb_values = (rgb_values[0] / 255, rgb_values[1] / 255, rgb_values[2] / 255)
                formatted_color = get_color_from_rgb(rgb_values)
                formatted_color['weighted_colorfulness'] = formatted_color['colorfulness'] + (2/(index+1))
                formated_colors.append(formatted_color)

            sorted_formated_colors = formated_colors.copy()
            sorted_formated_colors.sort(key=lambda c: c['weighted_colorfulness'], reverse=True)
            
            if (formated_colors[0]['hsv_values'][1] <= 0.05 or formated_colors[0]['hsv_values'][2] <= 0.15) and \
                sorted_formated_colors[0]['hsv_values'][0] > (15/360) and \
                sorted_formated_colors[0]['hsv_values'][0] < (42/360) and \
                sorted_formated_colors[0]['hsv_values'][1] > 0.22 and \
                sorted_formated_colors[0]['hsv_values'][1] < 0.70 and \
                sorted_formated_colors[0]['hsv_values'][2] > 0.45:
                selected_color = formated_colors[0]
                
                # choose most colorful color for alts
                formated_colors.sort(key=lambda c: c['weighted_colorfulness'], reverse=True)
                if formated_colors[0]['weighted_colorfulness'] > 0:
                    alt_two_rgb_values, alt_three_rgb_values = calculate_alts(formated_colors[0]['rgb_values'])
                    selected_color['alt_two_rgb_color'] = [int(alt_two_rgb_values[0] * 255), int(alt_two_rgb_values[1] * 255), int(alt_two_rgb_values[2] * 255)]
                    selected_color['alt_three_rgb_color'] = [int(alt_three_rgb_values[0] * 255), int(alt_three_rgb_values[1] * 255), int(alt_three_rgb_values[2] * 255)]
                else:
                    alt_two_rgb_values, alt_three_rgb_values = calculate_alts((255/255, 79/255, 79/255))
                    selected_color['alt_two_rgb_color'] = [int(alt_two_rgb_values[0] * 255), int(alt_two_rgb_values[1] * 255), int(alt_two_rgb_values[2] * 255)]
                    selected_color['alt_three_rgb_color'] = [int(alt_three_rgb_values[0] * 255), int(alt_three_rgb_values[1] * 255), int(alt_three_rgb_values[2] * 255)]
            else:
                formated_colors.sort(key=lambda c: c['weighted_colorfulness'], reverse=True)
                selected_color = formated_colors[0]
                
                if selected_color['colorfulness'] == formated_colors[1]['colorfulness'] and formated_colors[1]['hsv_values'][2] < selected_color['hsv_values'][2]:
                    selected_color = formated_colors[1]

                if (selected_color['hsv_values'][1] * selected_color['hsv_values'][2]) > 0.75:
                    if formated_colors[1]['weighted_colorfulness'] > 5 and (formated_colors[1]['hsv_values'][1] * formated_colors[1]['hsv_values'][2]) < 0.75:
                        selected_color = formated_colors[1]
                    else:
                        if selected_color['hsv_values'][1] > selected_color['hsv_values'][2]:
                            s_adjustment = 0.00
                            v_adjustment = 0.10
                            selected_color = get_color_from_rgb(colorsys.hsv_to_rgb(selected_color['hsv_values'][0], selected_color['hsv_values'][1] - s_adjustment, selected_color['hsv_values'][2] - v_adjustment))
                        else:
                            s_adjustment = 0.00
                            v_adjustment = 0.10
                            selected_color = get_color_from_rgb(colorsys.hsv_to_rgb(selected_color['hsv_values'][0], selected_color['hsv_values'][1] - s_adjustment, selected_color['hsv_values'][2] - v_adjustment))
                
                elif (selected_color['hsv_values'][1] * selected_color['hsv_values'][2]) > 0.65 and selected_color['rgb_values'][1] >= .75:
                    if selected_color['hsv_values'][1] > selected_color['hsv_values'][2]:
                        s_adjustment = 0.00
                        v_adjustment = 0.10
                        selected_color = get_color_from_rgb(colorsys.hsv_to_rgb(selected_color['hsv_values'][0], selected_color['hsv_values'][1] - s_adjustment, selected_color['hsv_values'][2] - v_adjustment))
                    else:
                        s_adjustment = 0.00
                        v_adjustment = 0.10
                        selected_color = get_color_from_rgb(colorsys.hsv_to_rgb(selected_color['hsv_values'][0], selected_color['hsv_values'][1] - s_adjustment, selected_color['hsv_values'][2] - v_adjustment))
                
                alt_two_rgb_values, alt_three_rgb_values = calculate_alts(selected_color['rgb_values'])
                selected_color['alt_two_rgb_color'] = [int(alt_two_rgb_values[0] * 255), int(alt_two_rgb_values[1] * 255), int(alt_two_rgb_values[2] * 255)]
                selected_color['alt_three_rgb_color'] = [int(alt_three_rgb_values[0] * 255), int(alt_three_rgb_values[1] * 255), int(alt_three_rgb_values[2] * 255)]
        except:
            pass
    else:
        selected_color['rgb_color'] = [0,0,0]
        selected_color['alt_one_rgb_color'] = [255,255,255]
        selected_color['alt_two_rgb_color'] = [255,79,79]
        selected_color['alt_three_rgb_color'] = [255,79,79]
        selected_color['text_rgb_color'] = [255,255,255]

    return selected_color
    
        
        
    

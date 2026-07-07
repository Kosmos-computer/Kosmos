import pytest
import fathom_asr_core as core

def test_dots_treament():
    '''
    ==================================================================================================
    In order to facilitate future applications that rely on sentences or paragraphs segmentations,
    the dots and question marks will always indicate End Of Sentence, except when found in the 
    allowed_in_sentence_dots listed in utilities/text.py:

    ==================================================================================================
    '''
    segment = '''And our mutual friend, Dr. Peter Attia,'''
    assert core.text.dots_treatments(segment) == '''And our mutual friend, Dr. Peter Attia,'''

    segment = '''And I thought, well, I want to take better care of myself than I do, etc., etc. But I also thought a lot of this is not in my hands at all. I thought one should have his affairs in order.'''
    assert core.text.dots_treatments(segment) == '''And I thought, well, I want to take better care of myself than I do, etc., etc. But I also thought a lot of this is not in my hands at all. I thought one should have his affairs in order.'''

    segment = '''please go to livemomentus.com slash Huberman.'''
    assert core.text.dots_treatments(segment) == '''please go to livemomentus.com slash Huberman.'''

    segment = '''So I was in there at 6 a.m., I was in there at noon,'''
    assert core.text.dots_treatments(segment) == '''So I was in there at 6 am, I was in there at noon,'''

    segment = '''Again, that's roca, R-O-K-A.com'''
    assert core.text.dots_treatments(segment) == '''Again, that's roca, R-O-K-A.com'''

    segment = '''And you think you can shut somebody up. Crime in the cities of Chicago, St. Louis, Baltimore, Philadelphia, Washington, D.C. is out of control, some person might say. Murder rate is high.'''
    assert core.text.dots_treatments(segment) == '''And you think you can shut somebody up. Crime in the cities of Chicago, St. Louis, Baltimore, Philadelphia, Washington, DC is out of control, some person might say. Murder rate is high.'''

    segment = '''Again, go to HubermanLab.com'''
    assert core.text.dots_treatments(segment) == '''Again, go to HubermanLab.com'''

    segment = '''There's some evidence that maybe even up to like 2.4'''
    assert core.text.dots_treatments(segment) == '''There's some evidence that maybe even up to like 2.4'''


def test_cleaning_and_revert_numberizer():

    segment = '''There's some evidence that maybe even up to like 2.4'''
    result = core.text.cleaning_and_revert_numberizer(segment)
    non_numberized_segment = [x['replacement'] for x in result]
    non_numberized_segment = ' '.join(non_numberized_segment)
    assert non_numberized_segment == '''There's some evidence that maybe even up to like two four''' # It is better less than more for the alignment porpuses

    segment = '''He had three sons, one of whom is in his early 30s, two of whom are in their late 30s. These are my sister's children. She's deceased. Now he's deceased.'''
    result = core.text.cleaning_and_revert_numberizer(segment)
    non_numberized_segment = [x['replacement'] for x in result]
    non_numberized_segment = ' '.join(non_numberized_segment)
    assert non_numberized_segment == '''He had three sons one of whom is in his early thirtys two of whom are in their late thirtys These are my sister's children She's deceased Now he's deceased'''

    segment = '''I would expect that if blacks are 10% of the population, they'd be 10% of every one'''
    result = core.text.cleaning_and_revert_numberizer(segment)
    non_numberized_segment = [x['replacement'] for x in result]
    non_numberized_segment = ' '.join(non_numberized_segment)
    assert non_numberized_segment == '''I would expect that if blacks are ten percent of the population they'd be ten percent of every one'''

    segment = '''to shoplift something or thinks I'm only going to spend $50,000.'''
    result = core.text.cleaning_and_revert_numberizer(segment)
    non_numberized_segment = [x['replacement'] for x in result]
    non_numberized_segment = ' '.join(non_numberized_segment)
    assert non_numberized_segment == '''to shoplift something or thinks I'm only going to spend fifty thousand dollars'''

    segment = '''to shoplift something or thinks I'm only going to spend $50,000'''
    result = core.text.cleaning_and_revert_numberizer(segment)
    non_numberized_segment = [x['replacement'] for x in result]
    non_numberized_segment = ' '.join(non_numberized_segment)
    assert non_numberized_segment == '''to shoplift something or thinks I'm only going to spend fifty thousand dollars'''

    segment = '''about $1,000 a month for coaching, right?'''
    result = core.text.cleaning_and_revert_numberizer(segment)
    non_numberized_segment = [x['replacement'] for x in result]
    non_numberized_segment = ' '.join(non_numberized_segment)
    assert non_numberized_segment == '''about one thousand dollars a month for coaching right'''


    ## Lex:
    # segment = '''Let's look at who's actually starting businesses and so on. To say that in a fair world, I would expect that if blacks are 10% of the population, they'd be 10% of every one of those things is to ignore the reality that the differences in the culture and practices and norms of the various population groups will lead to differences in their representation amongst people who are outstanding performers.'''

    # segment = '''But you know what I mean and the clothing, the salesman in the clothing store, either treats me like, you know, an old friend and is warm and welcoming and what can I do for you, sir, and let me show you this and that and what are you looking for and what because he thinks I'm going to spend $1,000 there that day and he's going to get a 5% commission or whatever it is and, you know, he either does that or he ignores me and looks at me with suspicion and thinks I might be trying to shoplift something or thinks I'm only going to spend $50,000.'''

    # segment = '''This is Georg Cantor and all that kind of stuff Or Gödel's theorem'''



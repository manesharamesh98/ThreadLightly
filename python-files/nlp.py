import spacy
print ("hi")
nlp = spacy.load("en_core_web_sm")

text = "99% polyester, 1% elastane, 100% cotton"
doc = nlp(text)

materials = [ent.text for ent in doc.ents if ent.label_ == "PRODUCT"]
print(materials)
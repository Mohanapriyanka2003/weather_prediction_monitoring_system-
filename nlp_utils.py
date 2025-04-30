import spacy
from spacy.matcher import PhraseMatcher

# Load the English model
nlp = spacy.load("en_core_web_sm")

# Sample list of skill keywords
SKILL_KEYWORDS = [
    "Python", "Java", "C++", "SQL", "Machine Learning", "Deep Learning",
    "TensorFlow", "PyTorch", "NLP", "Data Analysis", "Excel", "Power BI",
    "Tableau", "REST API", "Git", "Docker", "Kubernetes", "AWS", "Linux",
    "Communication", "Leadership", "Teamwork", "Problem Solving", "Fast Learner"
]

# Prepare matcher
matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
patterns = [nlp.make_doc(skill) for skill in SKILL_KEYWORDS]
matcher.add("SKILLS", patterns)

def extract_skills(text):
    """
    Extracts skills from text using spaCy's PhraseMatcher.
    """
    doc = nlp(text)
    matches = matcher(doc)

    extracted_skills = set()
    for match_id, start, end in matches:
        span = doc[start:end]
        extracted_skills.add(span.text)

    return list(extracted_skills)

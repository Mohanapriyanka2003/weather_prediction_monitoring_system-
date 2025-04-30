from sentence_transformers import SentenceTransformer, util

# Load embedding model once
model = SentenceTransformer('all-MiniLM-L6-v2')

def rank_resumes_by_job_description(job_description, resume_texts, resume_names):
    job_embedding = model.encode(job_description, convert_to_tensor=True)
    resume_embeddings = model.encode(resume_texts, convert_to_tensor=True)

    similarities = util.cos_sim(job_embedding, resume_embeddings)[0]
    ranked = sorted(zip(resume_names, resume_texts, similarities), key=lambda x: x[2], reverse=True)

    return [(name, text, score.item()) for name, text, score in ranked]

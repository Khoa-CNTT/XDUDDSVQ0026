<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Author;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class AuthorController extends Controller
{
    /**
     * Display a listing of authors.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        try {
            // Get all authors
            $authors = Author::all();
            
            // Log the authors for debugging
            Log::info('Authors retrieved:', ['count' => $authors->count(), 'sample' => $authors->take(1)->toArray()]);
            
            return response()->json([
                'success' => true,
                'data' => $authors
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve authors: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve authors',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created author in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name_author' => 'required|string|max:255',
                'bio' => 'nullable|string',
                'nationality' => 'nullable|string|max:100',
                'birth_date' => 'nullable|date',
                'death_date' => 'nullable|date',
                'image_author' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Generate a unique author_id if not provided
            if (!$request->has('author_id')) {
                $request->merge(['author_id' => 'A' . rand(1000, 9999)]);
            }

            $author = Author::create($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Author created successfully',
                'data' => $author
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create author',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified author.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        try {
            $author = Author::findOrFail($id);
            return response()->json([
                'success' => true,
                'data' => $author
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Author not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified author in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name_author' => 'required|string|max:255',
                'bio' => 'nullable|string',
                'nationality' => 'nullable|string|max:100',
                'birth_date' => 'nullable|date',
                'death_date' => 'nullable|date',
                'image_author' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $author = Author::findOrFail($id);
            $author->update($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Author updated successfully',
                'data' => $author
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update author',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified author from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        try {
            $author = Author::findOrFail($id);
            $author->delete();

            return response()->json([
                'success' => true,
                'message' => 'Author deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete author',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

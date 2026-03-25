package response

import "github.com/gin-gonic/gin"

// Response is the standard API response format
type Response struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Data    any    `json:"data"`
}

// Success sends a success response
func Success(c *gin.Context, code int, message string, data any) {
	c.JSON(code, Response{
		Status:  "success",
		Message: message,
		Data:    data,
	})
}

// Error sends an error response
func Error(c *gin.Context, code int, message string) {
	c.JSON(code, Response{
		Status:  "error",
		Message: message,
		Data:    nil,
	})
}
